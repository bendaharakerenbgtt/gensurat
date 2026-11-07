/**
 * GenSurat - storage.js
 * Manages IndexedDB for heavy image assets and LocalStorage for document drafts.
 */

const DOCS_STORAGE_KEY = 'gensurat_documents_v1';
const ACTIVE_DOC_ID_KEY = 'gensurat_active_doc_id';
const PROFIL_STORAGE_KEY = 'gensurat_profile_v1';
const THEME_STORAGE_KEY = 'theme';

// ==========================================
// INDEXEDDB ENGINE (For Logos, Watermarks, Notas, Photos)
// ==========================================
const GensuratDB = {
    db: null,
    dbName: 'gensurat_db',
    storeName: 'media_assets',
    version: 1,

    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'key' });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onerror = (e) => {
                console.warn('IndexedDB unavailable, fallback to memory/localStorage', e);
                resolve(null);
            };
        });
    },

    async put(key, data) {
        try {
            await this.init();
            if (!this.db) return false;
            return new Promise((resolve) => {
                const tx = this.db.transaction([this.storeName], 'readwrite');
                const store = tx.objectStore(this.storeName);
                store.put({ key, data, updated: Date.now() });
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            });
        } catch (e) {
            console.error('Error saving to IndexedDB:', e);
            return false;
        }
    },

    async get(key) {
        try {
            await this.init();
            if (!this.db) return null;
            return new Promise((resolve) => {
                const tx = this.db.transaction([this.storeName], 'readonly');
                const store = tx.objectStore(this.storeName);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result ? req.result.data : null);
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            console.error('Error reading from IndexedDB:', e);
            return null;
        }
    },

    async delete(key) {
        try {
            await this.init();
            if (!this.db) return false;
            return new Promise((resolve) => {
                const tx = this.db.transaction([this.storeName], 'readwrite');
                const store = tx.objectStore(this.storeName);
                store.delete(key);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            });
        } catch (e) {
            console.error('Error deleting from IndexedDB:', e);
            return false;
        }
    }
};

// ==========================================
// DOCUMENT STORAGE (LocalStorage JSON)
// ==========================================
function getSavedDocuments() {
    try {
        const raw = localStorage.getItem(DOCS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('Failed to parse saved documents from localStorage:', e);
        return [];
    }
}

function saveDocumentsList(list) {
    try {
        localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(list));
        return true;
    } catch (e) {
        console.error('Failed to save documents to localStorage:', e);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Memori Penuh',
                text: 'Penyimpanan lokal browser penuh. Hapus beberapa dokumen lama atau ekspor cadangan (.json).'
            });
        }
        return false;
    }
}

function getActiveDocumentId() {
    return localStorage.getItem(ACTIVE_DOC_ID_KEY) || null;
}

function setActiveDocumentId(id) {
    if (id) {
        localStorage.setItem(ACTIVE_DOC_ID_KEY, id);
    } else {
        localStorage.removeItem(ACTIVE_DOC_ID_KEY);
    }
}

function getActiveDocument() {
    const activeId = getActiveDocumentId();
    const docs = getSavedDocuments();
    if (activeId) {
        const found = docs.find(d => d.id === activeId);
        if (found) return found;
    }
    return docs.length > 0 ? docs[0] : null;
}

function createNewDocument(type = 'SPZ', title = '') {
    const now = new Date();
    const id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const finalTitle = title.trim() || `${type} Surat Baru`;
    
    // Copy current organization profile as snapshot for this document
    const orgProfile = typeof getOrganizationProfile === 'function' ? getOrganizationProfile() : {};

    const newDoc = {
        id,
        type: (type === 'SBA') ? 'SBA' : 'SPZ',
        title: finalTitle,
        createdAt: now.toISOString(),
        lastModified: now.toISOString(),
        profile: JSON.parse(JSON.stringify(orgProfile)),
        formData: {},
        spzData: {
            barang: [
                { nama: '', jumlah: '' },
                { nama: '', jumlah: '' }
            ],
            panitia: [
                { nama: '', nim: '', prodi: '', delegasi: orgProfile.org_singkatan || 'XXX' },
                { nama: '', nim: '', prodi: '', delegasi: orgProfile.org_singkatan || 'XXX' }
            ],
            rundown: [
                { nama: '', waktu: '', pj: '' },
                { nama: '', waktu: '', pj: '' }
            ]
        },
        sbaData: {
            rundown: [
                { nama: '', waktu: '', pj: '' },
                { nama: '', waktu: '', pj: '' }
            ],
            prestasi: [
                { nama: '', nim: '', prodi: '', kategori: '', capaian: '' }
            ],
            pemasukan: [
                { uraian: '', nominal: '' }
            ],
            pengeluaran: [
                {
                    nama: 'BELANJA PERLENGKAPAN & KONSUMSI',
                    divisi: [
                        {
                            nama: 'Divisi Perlengkapan',
                            items: [
                                { uraian: '', volume: '1', satuan: 'Pcs', harga: 0, total: 0 }
                            ]
                        }
                    ]
                }
            ],
            notas: [],
            dokumentasi: []
        }
    };

    const docs = getSavedDocuments();
    docs.unshift(newDoc);
    saveDocumentsList(docs);
    setActiveDocumentId(id);
    return newDoc;
}

function duplicateDocument(id) {
    const docs = getSavedDocuments();
    const target = docs.find(d => d.id === id);
    if (!target) return null;

    const copy = JSON.parse(JSON.stringify(target));
    copy.id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    copy.title = target.title + ' (Salinan)';
    copy.createdAt = new Date().toISOString();
    copy.lastModified = new Date().toISOString();

    docs.unshift(copy);
    saveDocumentsList(docs);
    return copy;
}

function deleteDocument(id) {
    let docs = getSavedDocuments();
    docs = docs.filter(d => d.id !== id);
    saveDocumentsList(docs);

    if (getActiveDocumentId() === id) {
        if (docs.length > 0) {
            setActiveDocumentId(docs[0].id);
        } else {
            setActiveDocumentId(null);
        }
    }
    return true;
}

function exportAllDocumentsJson() {
    const docs = getSavedDocuments();
    const profile = typeof getOrganizationProfile === 'function' ? getOrganizationProfile() : {};
    const exportBundle = {
        app: 'GenSurat',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        profile,
        documents: docs
    };

    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_gensurat_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importDocumentsJson(jsonContent) {
    try {
        const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
        if (!data || (!Array.isArray(data) && !Array.isArray(data.documents))) {
            throw new Error('Format file cadangan tidak valid.');
        }

        const incomingDocs = Array.isArray(data) ? data : data.documents;
        const currentDocs = getSavedDocuments();
        
        // Merge without duplicate IDs
        const existingIds = new Set(currentDocs.map(d => d.id));
        let addedCount = 0;

        incomingDocs.forEach(doc => {
            if (doc && doc.id && !existingIds.has(doc.id)) {
                currentDocs.push(doc);
                existingIds.add(doc.id);
                addedCount++;
            } else if (doc && doc.title) {
                // If ID collision, assign new ID
                const copy = JSON.parse(JSON.stringify(doc));
                copy.id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
                currentDocs.push(copy);
                addedCount++;
            }
        });

        // If backup has profile and user wants it
        if (data.profile && typeof saveOrganizationProfile === 'function') {
            saveOrganizationProfile(data.profile);
        }

        saveDocumentsList(currentDocs);
        return { success: true, count: addedCount };
    } catch (e) {
        console.error('Import error:', e);
        return { success: false, error: e.message };
    }
}

function formatRelativeTime(isoString) {
    if (!isoString) return 'Baru saja';
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'Baru saja';
        if (diffMin < 60) return `${diffMin} menit yang lalu`;
        if (diffHour < 24) return `${diffHour} jam yang lalu`;
        if (diffDay < 7) return `${diffDay} hari yang lalu`;
        
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
        return 'Baru saja';
    }
}
