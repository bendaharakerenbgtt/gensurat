import assert from 'node:assert';
import { parseRichTextRuns } from '../js/engine/export_pdf.js';

const runs = parseRichTextRuns('Melalui surat ini, kami **Unit Kegiatan Mahasiswa** bermaksud mengajukan *Open House*.');
assert.strictEqual(runs.length, 5);
assert.strictEqual(runs[1].text, 'Unit Kegiatan Mahasiswa');
assert.strictEqual(runs[1].bold, true);
assert.strictEqual(runs[3].text, 'Open House');
assert.strictEqual(runs[3].italic, true);
console.log('✓ test_export_multipage passed');
