import assert from 'node:assert';
import { detectDocumentStructure } from '../js/engine/semantic_detector.js';

const mockLines = [
    { text: 'UNIT KEGIATAN MAHASISWA', x: 120, y: 25, width: 350, height: 14, fontSize: 14, fontName: 'Times-Bold' },
    { text: 'LDK IKATAN MAHASISWA ISLAM', x: 110, y: 42, width: 370, height: 14, fontSize: 14, fontName: 'Times-Bold' },
    { text: 'Jakarta, 08 September 2026', x: 380, y: 115, width: 160, height: 11, fontSize: 11, fontName: 'Times' },
    { text: 'Nomor', x: 50, y: 140, width: 40, height: 11, fontSize: 11, fontName: 'Times' },
    { text: ':', x: 95, y: 140, width: 5, height: 11, fontSize: 11, fontName: 'Times' },
    { text: '042/SPM/E1/UKM IMIP/IX/2026', x: 105, y: 140, width: 170, height: 11, fontSize: 11, fontName: 'Times' },
    { text: 'Hal', x: 50, y: 160, width: 25, height: 11, fontSize: 11, fontName: 'Times' },
    { text: ':', x: 95, y: 160, width: 5, height: 11, fontSize: 11, fontName: 'Times' },
    { text: 'Surat Permohonan Pemunduran Open House', x: 105, y: 160, width: 220, height: 11, fontSize: 11, fontName: 'Times' },
    { text: 'Yth. Majelis Permusyawaratan Mahasiswa', x: 50, y: 190, width: 250, height: 11, fontSize: 11, fontName: 'Times-Bold' },
    { text: 'Dengan Hormat,', x: 50, y: 235, width: 90, height: 11, fontSize: 11, fontName: 'Times' },
    { text: 'Melalui surat ini kami Unit Kegiatan Mahasiswa LDK IMIP bermaksud mengajukan permohonan pemunduran jadwal open house.', x: 50, y: 260, width: 495, height: 35, fontSize: 11, fontName: 'Times' },
    { text: 'Penanggung Jawab,', x: 350, y: 420, width: 120, height: 11, fontSize: 11, fontName: 'Times' },
    { text: 'Ketua UKM LDK IMIP', x: 350, y: 490, width: 130, height: 11, fontSize: 11, fontName: 'Times-Bold' },
    { text: 'Tembusan :', x: 50, y: 600, width: 70, height: 11, fontSize: 11, fontName: 'Times' },
    { text: '1. Arsip', x: 50, y: 615, width: 50, height: 11, fontSize: 11, fontName: 'Times' }
];

const mockImages = [
    { x: 45, y: 20, width: 60, height: 60, objId: 'img_logo_left', isLogo: true },
    { x: 490, y: 20, width: 60, height: 60, objId: 'img_logo_right', isLogo: true }
];

const structure = detectDocumentStructure(mockLines, mockImages, { width: 595, height: 842 });
assert.ok(structure.kopZone.logos.length === 2, 'Should detect 2 logos in kop zone');
assert.ok(structure.kopZone.lines.length >= 2, 'Should detect Kop header lines');
assert.ok(structure.metadataZone.elements.length >= 2, 'Should unify Nomor and Hal lines');
assert.strictEqual(structure.metadataZone.elements[0].text, 'Nomor : 042/SPM/E1/UKM IMIP/IX/2026');
assert.strictEqual(structure.metadataZone.elements[1].text, 'Hal : Surat Permohonan Pemunduran Open House');
assert.ok(structure.recipientZone.elements.length >= 1, 'Should identify recipient block');
assert.ok(structure.greetingZone.elements.length >= 1, 'Should identify greeting line');
assert.ok(structure.bodyParagraphs.elements.length === 1, 'Should identify body paragraph');
assert.ok(structure.signatureZone.elements.length >= 1, 'Should identify signature block');
assert.ok(structure.tembusanZone.elements.length >= 1, 'Should identify tembusan zone');

console.log('✓ test_semantic_detector passed all assertions!');
