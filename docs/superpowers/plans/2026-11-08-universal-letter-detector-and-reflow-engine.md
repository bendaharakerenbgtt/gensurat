# Universal Letter Semantic Detector, Multi-Page Reflow Engine & TypeSafe Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a universal document processing engine that automatically recognizes the anatomy of any official letter (.pdf and .docx) without hardcoded coordinates, enables Word-like paragraph reflow with multi-page overflow spillover without font ballooning or text collisions, and integrates an optional TypeSafe System One decision helper.

**Architecture:** A modular 5-stage pipeline: (1) Operator-level PDF & multi-part DOCX parser extracting true coordinates of images, watermarks, and text; (2) Format-agnostic semantic zone detector with Indonesian document grammar and optional TypeSafe Jev fallback; (3) Flowable typography & multi-page canvas virtualizer with exact CSS/PDF unit parity (1 pt = 1 px at scale 1.0); (4) Mutation engine with undo/redo and live OOXML sync; (5) Dual export engine with dynamic page allocation and micro-targeted whiteouts preserving watermarks.

**Tech Stack:** Vanilla JavaScript (ES Modules, Client-Side), PDF.js 3.11, PDF-Lib 1.17, JSZip 3.10, Tailwind CSS, Playwright.

**Spec:** [`docs/superpowers/specs/2026-11-08-universal-letter-detector-and-reflow-engine-design.md`](file:///c:/Users/iqi/Documents/universalsurat/docs/superpowers/specs/2026-11-08-universal-letter-detector-and-reflow-engine-design.md)

## Global Constraints

- 100% client-side processing in browser via lightweight CDN libraries (PDF.js, PDF-Lib, JSZip) with 0 KB backend server overhead.
- Total repository size on Vercel remains minimal (<200 KB).
- Input formats are strictly document files: `.pdf`, `.docx`, and `.doc`. Direct raw photo/image uploads are not accepted as base documents (images are only uploaded to replace logos or insert signatures).
- Zero hardcoded coordinates (no static `x: 46, y: 5` or `y < 95` magic numbers). All zones and logo targets must be dynamically derived from the document's actual layout and image operator lists.
- Full round-trip fidelity: editing one paragraph or replacing a logo must never corrupt unrelated document properties, fonts, headers, or margin geometry.
- Consistent typography: 1 pt in PDF = 1 px in CSS DOM overlay at scale 1.0 (595 pt = 595 px); measurer and renderer must share identical font family, size in px, line-height, and `padding: 0`.

## Review Focus

1. **Rasterized Kop Surat Headers:** Letters where the Kop Surat consists of images with zero text items at the top must still generate interactive logo replacement boxes derived from image operators.
2. **Multi-Page Overflow Spillover:** When a body paragraph expands such that downstream elements (closing, signature blocks, CC) exceed the printable bottom margin (`y + height > pageHeight - 50`), the engine must allocate a new Page 2 and mount a second canvas sheet, and `export_pdf.js` must invoke `pdfDoc.addPage()`.
3. **Watermark / Background Preservation:** Background vector art or batik watermarks behind text must not be wiped out by broad white rectangles; whiteout patches must tightly hug individual text line bounds.
4. **Multi-column Metadata Rows:** Fragmented items (`Nomor`, `:`, `042/SPM/...`) separated by tab gaps must be unified into single editable metadata rows rather than disjointed clickable targets.
5. **Rich Text Run Parity:** Paragraphs containing bold phrases (e.g. `**Unit Kegiatan Mahasiswa LDK IMIP**`) must retain bold styling in DOM, DOCX `<w:r>` runs, and PDF-lib embedded fonts.

---

### Task 1: Semantic Document Detector (`semantic_detector.js`)

**Files:**
- Create: `js/engine/semantic_detector.js`
- Test: `tests/test_semantic_detector.mjs`

**Interfaces:**
- Consumes: `lines: Array<{ text, x, y, width, height, fontSize, fontName, rawItems }>`, `images: Array<{ x, y, width, height, objId }>`, `pageDimensions: { width, height }`.
- Produces: `detectDocumentStructure(lines, images, pageDimensions) -> { kopZone: { elements, logos }, metadataZone: { elements }, recipientZone: { elements }, greetingZone: { elements }, bodyParagraphs: { elements }, closingZone: { elements }, signatureZone: { elements }, tembusanZone: { elements } }`.

- [ ] **Step 1: Write the failing test for semantic detection**

```javascript
// tests/test_semantic_detector.mjs
import assert from 'node:assert';
import { detectDocumentStructure } from '../js/engine/semantic_detector.js';

const mockLines = [
    { text: 'UNIT KEGIATAN MAHASISWA', x: 120, y: 25, width: 350, height: 14, fontSize: 14, fontName: 'Times-Bold' },
    { text: 'LDK IKATAN MAHASISWA ISLAM', x: 110, y: 42, width: 370, height: 14, fontSize: 14, fontName: 'Times-Bold' },
    { text: 'Jakarta, 08 September 2026', x: 380, y: 115, width: 160, height: 11, fontSize: 11, fontName: 'Times' },
    { text: 'Nomor', x: 50, y: 140, width: 40, height: 11, fontSize: 11, fontName: 'Times' },
    { text: ':', x: 95, y: 140, width: 5, height: 11, fontSize: 11, fontName: 'Times' },
    { text: '042/SPM/E1/UKM IMIP/IX/2026', x: 105, y: 140, width: 170, height: 11, fontSize: 11, fontName: 'Times' },
    { text: 'Yth. Majelis Permusyawaratan Mahasiswa', x: 50, y: 190, width: 250, height: 11, fontSize: 11, fontName: 'Times-Bold' },
    { text: 'Dengan Hormat,', x: 50, y: 235, width: 90, height: 11, fontSize: 11, fontName: 'Times' },
    { text: 'Melalui surat ini kami bermaksud mengajukan permohonan pemunduran jadwal open house.', x: 50, y: 260, width: 495, height: 35, fontSize: 11, fontName: 'Times' },
    { text: 'Penanggung Jawab,', x: 350, y: 420, width: 120, height: 11, fontSize: 11, fontName: 'Times' },
    { text: 'Ketua UKM LDK IMIP', x: 350, y: 490, width: 130, height: 11, fontSize: 11, fontName: 'Times-Bold' }
];

const mockImages = [
    { x: 45, y: 20, width: 60, height: 60, objId: 'img_logo_left' },
    { x: 490, y: 20, width: 60, height: 60, objId: 'img_logo_right' }
];

const structure = detectDocumentStructure(mockLines, mockImages, { width: 595, height: 842 });
assert.ok(structure.kopZone.logos.length === 2, 'Should detect 2 logos in kop zone');
assert.ok(structure.metadataZone.elements.length >= 1, 'Should unify Nomor line');
assert.strictEqual(structure.metadataZone.elements[0].text, 'Nomor : 042/SPM/E1/UKM IMIP/IX/2026');
assert.ok(structure.bodyParagraphs.elements.length === 1, 'Should identify body paragraph');
assert.ok(structure.signatureZone.elements.length >= 1, 'Should identify signature block');
console.log('✓ test_semantic_detector passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test_semantic_detector.mjs`  
Expected: FAIL (Cannot find module `../js/engine/semantic_detector.js`)

- [ ] **Step 3: Implement `semantic_detector.js`**

Implement `detectDocumentStructure(lines, images, pageDimensions)`:
- Unifies split metadata lines (label + colon + value within `Math.abs(y1 - y2) <= 3` and gap `<= 150pt`).
- Clusters kop header items (lines and images at $y < 0.22 \times \text{height}$ before the date/metadata).
- Identifies recipient (`Yth.`, `Di Tempat`), salutation (`Dengan [hH]ormat`), body paragraphs (justified/wide blocks), and signature blocks (`Ketua`, `Sekretaris`, `Pembina`, `Mengetahui`, `NIP`, `NIM`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test_semantic_detector.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/engine/semantic_detector.js tests/test_semantic_detector.mjs
git commit -m "feat(engine): implement universal semantic document zone detector"
```

---

### Task 2: PDF Image & True Logo Coordinates Extractor (`pdf_adapter.js`)

**Files:**
- Modify: `js/engine/pdf_adapter.js`
- Test: `tests/test_pdf_logo_extraction.mjs`

**Interfaces:**
- Consumes: PDF.js `page.getOperatorList()`, `page.objs`, `viewport`.
- Produces: `extractPdfImages(page, viewport) -> Array<{ x, y, width, height, objId, isLogo, isWatermark }>` and replaces static logo boxes with dynamically detected logos.

- [ ] **Step 1: Write failing test for PDF image extraction**

```javascript
// tests/test_pdf_logo_extraction.mjs
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { parsePdfDocument } from '../js/engine/pdf_adapter.js';

// Test against actual sample file 042_SPM_ OPEN HOUSE LDK IMIP 2026.pdf
const filePath = path.join(process.cwd(), 'contoh', '042_SPM_ OPEN HOUSE LDK IMIP 2026.pdf');
const buf = fs.readFileSync(filePath);

// Needs browser globals for pdf.js, run in node using Playwright evaluation or mocked worker
assert.ok(buf.length > 0, 'Sample PDF must exist');
console.log('✓ test_pdf_logo_extraction fixture verified');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test_pdf_logo_extraction.mjs`  
Expected: Verify requirement or test runner setup.

- [ ] **Step 3: Implement operator list extraction in `pdf_adapter.js`**

- In `parsePdfDocument`: Call `page.getOperatorList()`.
- Scan for `OPS.paintImageXObject`, `OPS.paintInlineImageXObject`, `OPS.paintJpegXObject`.
- Compute bounding box from transformation matrix:
  `x = transform[4]`, `y = viewport.height - transform[5] - height`, `width = transform[0]`, `height = transform[3]`.
- Classify images located at $y < 0.25 \times \text{height}$ as `kop_logo` elements in `pageModel.elements` with exact $(x, y, w, h)$.
- Pass lines and extracted images through `detectDocumentStructure` from Task 1.

- [ ] **Step 4: Run test to verify it passes**

Run test verifying that `042_SPM_ OPEN HOUSE LDK IMIP 2026.pdf` extracts true logo targets matching image operators without static `x: 46 / 448`.

- [ ] **Step 5: Commit**

```bash
git add js/engine/pdf_adapter.js tests/test_pdf_logo_extraction.mjs
git commit -m "feat(pdf): extract true image coordinates from PDF operator list"
```

---

### Task 3: DOCX Multi-Header & Relationship Extractor (`docx_adapter.js`)

**Files:**
- Modify: `js/engine/docx_adapter.js`
- Test: `tests/test_docx_header_extraction.mjs`

**Interfaces:**
- Consumes: JSZip instance containing `word/header*.xml`, `word/_rels/header*.xml.rels`, and `word/media/*`.
- Produces: `docModel.pages[0].elements` containing Kop Surat logos (`type: 'kop_logo'`) and header paragraphs parsed from `word/header1.xml`.

- [ ] **Step 1: Write failing test for DOCX header extraction**

```javascript
// tests/test_docx_header_extraction.mjs
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { JSDOM } from 'jsdom';

// Setup DOM globals for test
const dom = new JSDOM();
globalThis.window = dom.window;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.JSZip = JSZip;

const { parseDocxDocument } = await import('../js/engine/docx_adapter.js');

const filePath = path.join(process.cwd(), 'contoh', '016_SUD_SARAH MUTHIAH WIDAD.docx');
const buf = fs.readFileSync(filePath);
const docModel = await parseDocxDocument(buf.buffer, '016_SUD_SARAH MUTHIAH WIDAD.docx');

const headerLogos = docModel.pages[0].elements.filter(el => el.type === 'kop_logo');
assert.ok(headerLogos.length >= 1, 'Should extract kop logos from word/header1.xml');
console.log('✓ test_docx_header_extraction passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test_docx_header_extraction.mjs`  
Expected: FAIL (`headerLogos.length >= 1` fails because `docx_adapter.js` currently ignores `word/header*.xml`).

- [ ] **Step 3: Implement header extraction in `docx_adapter.js`**

- Read all `word/header*.xml` files present in the zip.
- Read corresponding `word/_rels/header*.xml.rels` to map image relationship IDs (`r:embed` / `r:id`) to files in `word/media/`.
- Convert drawing objects and header paragraphs into DIM elements and prepend to `pageModel.elements`.
- Save `zip.file('word/header*.xml')` references for round-trip logo replacement.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test_docx_header_extraction.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/engine/docx_adapter.js tests/test_docx_header_extraction.mjs
git commit -m "feat(docx): extract kop logos and headers from word/header*.xml"
```

---

### Task 4: Typography Parity, Sub-Pixel Reflow & Multi-Page Overflow Spillover (`canvas_renderer.js` & `mutation_engine.js`)

**Files:**
- Modify: `js/engine/canvas_renderer.js`
- Modify: `js/engine/mutation_engine.js`
- Test: `tests/test_canvas_reflow_multipage.mjs`

**Interfaces:**
- Consumes: `el.fontSize`, `el.fontFamily`, `el.text`, `el.rect`, `this.scale`.
- Produces: Exact CSS pixel font sizing (`fontSize * this.scale` in px, strictly avoiding `pt`), unified `padding: 0` between measurer and DOM, and automatic multi-page allocation when elements exceed $y + \text{height} > \text{pageHeight} - 50$.

- [ ] **Step 1: Write failing test for typography parity and multi-page spillover**

```javascript
// tests/test_canvas_reflow_multipage.mjs
import assert from 'node:assert';
import { calculateReflowAndPagination } from '../js/engine/canvas_renderer.js';

const pageHeight = 842;
const elements = [
    { id: 'p1', y: 250, height: 100, isModified: true, expandedHeight: 520 }, // Expands by 420px!
    { id: 'closing', y: 380, height: 40 },
    { id: 'sig', y: 440, height: 120 }
];

const result = calculateReflowAndPagination(elements, pageHeight);
assert.ok(result.pages.length === 2, 'Should spill overflowing signature to Page 2');
assert.strictEqual(result.pages[1].elements[0].id, 'sig', 'Signature should reside on Page 2');
console.log('✓ test_canvas_reflow_multipage passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test_canvas_reflow_multipage.mjs`  
Expected: FAIL (`calculateReflowAndPagination` not defined).

- [ ] **Step 3: Implement typography fix and multi-page spillover**

- In `canvas_renderer.js`:
  - Replace `${fontSize * scale}pt` with `${fontSize * this.scale}px` on lines 242 and 313.
  - Set `padding: 0` in both rendered overlay and `measureParagraphHeight`.
  - Export `calculateReflowAndPagination(elements, pageHeight, marginBottom = 50)`:
    Iterates elements. When downstream element $y_{\text{shifted}} + \text{height} > \text{pageHeight} - \text{marginBottom}$, moves element to Page 2 with new relative $y = y_{\text{shifted}} - (\text{pageHeight} - 80)$.
  - In `renderPdfPages`: Dynamically mount a second `.canvas-page-wrapper` for Page 2 if overflow occurs.
  - In `mutation_engine.js`: Update `docModel.pages` structure when pagination triggers.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test_canvas_reflow_multipage.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/engine/canvas_renderer.js js/engine/mutation_engine.js tests/test_canvas_reflow_multipage.mjs
git commit -m "fix(renderer): eliminate font ballooning, normalize padding, and implement multi-page overflow spillover"
```

---

### Task 5: Rich Formatting & Multi-Page PDF/DOCX Export (`export_pdf.js` & `export_docx.js`)

**Files:**
- Modify: `js/engine/export_pdf.js`
- Modify: `js/engine/export_docx.js`
- Test: `tests/test_export_multipage.mjs`

**Interfaces:**
- Consumes: `docModel` with potential multi-page overflow elements, Markdown formatting tokens (`**bold**`, `*italic*`), and micro-targeted whiteout rects.
- Produces: Valid `.pdf` (adding new pages via `pdfDoc.addPage` when elements spilled over) and valid `.docx` (reconstructing `<w:r>` with `<w:b/>`/`<w:i/>`).

- [ ] **Step 1: Write failing test for multi-page export and rich runs**

```javascript
// tests/test_export_multipage.mjs
import assert from 'node:assert';
import { parseRichTextRuns } from '../js/engine/export_pdf.js';

const runs = parseRichTextRuns('Melalui surat ini, kami **Unit Kegiatan Mahasiswa** bermaksud mengajukan *Open House*.');
assert.strictEqual(runs.length, 5);
assert.strictEqual(runs[1].text, 'Unit Kegiatan Mahasiswa');
assert.strictEqual(runs[1].bold, true);
assert.strictEqual(runs[3].text, 'Open House');
assert.strictEqual(runs[3].italic, true);
console.log('✓ test_export_multipage passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test_export_multipage.mjs`  
Expected: FAIL (`parseRichTextRuns` not defined).

- [ ] **Step 3: Implement rich runs & multi-page export**

- In `export_pdf.js`:
  - Implement `parseRichTextRuns(text)`.
  - In `exportToPdf`:
    - For each page in `docModel.pages`: If page index $\ge$ `pdfDoc.getPageCount()`, call `pdfDoc.addPage([pageModel.width, pageModel.height])`.
    - Apply micro-targeted whiteout per line (`height = el.fontSize * 1.15, padding = 1px`) hugging glyph boundaries.
    - Render text runs drawing bold text with `fontTimesBold` and italic text with `fontTimesItalic`.
- In `export_docx.js`:
  - Split modified Markdown text into `<w:r>` tags containing `<w:rPr><w:b/></w:rPr>` for `**` runs and `<w:rPr><w:i/></w:rPr>` for `*` runs.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test_export_multipage.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/engine/export_pdf.js js/engine/export_docx.js tests/test_export_multipage.mjs
git commit -m "feat(export): support multi-page overflow allocation and rich bold/italic runs"
```

---

### Task 6: TypeSafe System One Helper Module (`typesafe_client.js`)

**Files:**
- Create: `js/engine/typesafe_client.js`
- Modify: `js/engine/inspector.js`
- Test: `tests/test_typesafe_client.mjs`

**Interfaces:**
- Consumes: Optional `TYPESAFE_API_KEY` from `localStorage`, canvas snapshot / crop of header image.
- Produces: `detectLogoBoxesWithTypeSafe(imageSrc, apiKey) -> Promise<Array<{ ymin, xmin, ymax, xmax }>>` and `classifyDocumentSection(textSnippet, apiKey) -> Promise<string>`.

- [ ] **Step 1: Write test for TypeSafe client request formatting**

```javascript
// tests/test_typesafe_client.mjs
import assert from 'node:assert';
import { buildTypeSafeBoxPayload, parseTypeSafeBoxResponse } from '../js/engine/typesafe_client.js';

const payload = buildTypeSafeBoxPayload('data:image/png;base64,mock', 'Where is the logo in this header?');
assert.strictEqual(payload.question.type, 'box');
assert.ok(payload.state.image !== undefined);

const mockResp = { answer: { box: [0.05, 0.08, 0.18, 0.25] } };
const box = parseTypeSafeBoxResponse(mockResp, 595, 842);
assert.strictEqual(box.x, Math.round(0.08 * 595));
assert.strictEqual(box.y, Math.round(0.05 * 842));
console.log('✓ test_typesafe_client passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test_typesafe_client.mjs`  
Expected: FAIL (`buildTypeSafeBoxPayload` not found).

- [ ] **Step 3: Implement `typesafe_client.js` and inspector hook**

- Implement `buildTypeSafeBoxPayload`, `parseTypeSafeBoxResponse`, and `askTypeSafe(apiKey, payload)`.
- Degrade gracefully: If no API key is present or network fails, throw clean error caught by `inspector.js` to notify user.
- Add "Bantu dengan TypeSafe AI" button in `inspector.js` when editing kop logos or ambiguous sections.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test_typesafe_client.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/engine/typesafe_client.js js/engine/inspector.js tests/test_typesafe_client.mjs
git commit -m "feat(ai): integrate optional TypeSafe System One decision helper"
```

---

### Task 7: Comprehensive Automated E2E Validation Across 11 Sample Documents

**Files:**
- Create: `tests/test_e2e_universal.mjs`

**Interfaces:**
- Consumes: All 11 sample files in `contoh/`:
  - `019_SUD_MUHAMMAD JAISYUL HAQ.pdf`
  - `025_SPZ QURMEDIA 2026.pdf`
  - `034_SBA STUBAN 2026.pdf`
  - `042_SPM_ OPEN HOUSE LDK IMIP 2026.pdf`
  - `016_SUD_SARAH MUTHIAH WIDAD.docx`
  - `022_SUD_ALUMNI LDK IMIP.docx`
  - `026_SBA_DAUROH 2026.docx`
  - 4 `TEMPLATE_*.docx` files
- Produces: Automated Playwright run validating import, logo detection, paragraph expansion, multi-page overflow spillover, and PDF/DOCX downloads.

- [ ] **Step 1: Write E2E test covering all samples and reflow scenarios**

```javascript
// tests/test_e2e_universal.mjs
// Launches headless Chrome on local test server, iterates all 11 files in contoh/,
// performs in-place text edits, verifies no font ballooning, triggers multi-page overflow,
// and confirms valid exported PDF and DOCX binary headers.
```

- [ ] **Step 2: Run E2E test suite**

Run: `node tests/test_e2e_universal.mjs`  
Expected: PASS across all 11 documents with 0 console errors.

- [ ] **Step 3: Commit and deploy verification**

```bash
git add tests/test_e2e_universal.mjs
git commit -m "test(e2e): add comprehensive multi-document test suite for universal engine"
git push origin main
```
