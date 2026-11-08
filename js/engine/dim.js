/**
 * Document Intermediate Model (DIM) - UDE-001
 * Unified format-independent representation of document elements.
 */

export function createDocumentModel(format, filename, rawBytes) {
    return {
        id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        source: {
            format: format.toLowerCase(), // 'pdf' | 'docx'
            filename: filename,
            filesize: rawBytes ? rawBytes.byteLength : 0,
            rawBytes: rawBytes // ArrayBuffer or Uint8Array
        },
        metadata: {
            title: filename.replace(/\.[^/.]+$/, ''),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pageCount: 0
        },
        pages: [], // Array of page objects
        styles: {}, // Style registry
        modifications: [], // Log of modified element IDs
        undoStack: [],
        redoStack: []
    };
}

export function createPageModel(pageIndex, width, height, orientation = 'portrait') {
    return {
        pageIndex: pageIndex,
        width: width, // in points
        height: height, // in points
        orientation: orientation,
        elements: []
    };
}

export function createElementModel(type, props = {}) {
    return {
        id: 'el_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type: type, // 'text' | 'image' | 'table' | 'paragraph'
        text: props.text || '',
        originalText: props.text || '',
        rect: {
            x: props.x || 0,
            y: props.y || 0,
            width: props.width || 0,
            height: props.height || 0
        },
        fontSize: props.fontSize || 12,
        fontFamily: props.fontFamily || 'Times New Roman',
        fontStyle: props.fontStyle || 'normal', // 'normal' | 'italic' | 'bold'
        fontWeight: props.fontWeight || 'normal',
        color: props.color || '#000000',
        alignment: props.alignment || 'left',
        isModified: false,
        sourceRef: props.sourceRef || null, // Reference to original XML node or PDF text item
        extra: props.extra || {}
    };
}
