import assert from 'node:assert';
import { calculateReflowAndPagination } from '../js/engine/canvas_renderer.js';

// Test 1: Standard paragraph expansion within 1 page
const pageHeight = 842;
const singlePageElements = [
    { id: 'kop', y: 20, height: 60 },
    { id: 'meta', y: 120, height: 40 },
    { id: 'p1', y: 250, height: 80, isModified: true, expandedHeight: 140 }, // +60px
    { id: 'closing', y: 350, height: 30 },
    { id: 'sig', y: 400, height: 100 }
];

const res1 = calculateReflowAndPagination(singlePageElements, pageHeight);
assert.strictEqual(res1.pages.length, 1, 'Should remain 1 page if elements fit within 842px');
assert.strictEqual(res1.pages[0].elements.find(el => el.id === 'closing').shiftedY, 410, 'Closing should shift from 350 to 410 (+60px)');
assert.strictEqual(res1.pages[0].elements.find(el => el.id === 'sig').shiftedY, 460, 'Signature should shift from 400 to 460 (+60px)');

// Test 2: Massive expansion that causes multi-page overflow spillover!
const overflowingElements = [
    { id: 'kop', y: 20, height: 60 },
    { id: 'meta', y: 120, height: 40 },
    { id: 'p1', y: 250, height: 80, isModified: true, expandedHeight: 520 }, // +440px expansion!
    { id: 'closing', y: 350, height: 30 },
    { id: 'sig', y: 400, height: 120 } // pushed down to 400 + 440 = 840px (exceeds 842 - 50 = 792px)
];

const res2 = calculateReflowAndPagination(overflowingElements, pageHeight, 50);
assert.strictEqual(res2.pages.length, 2, 'Should automatically allocate Page 2 on overflow spillover');
assert.ok(res2.pages[1].elements.some(el => el.id === 'sig'), 'Signature block must spill over to Page 2');
assert.ok(res2.pages[1].elements[0].y >= 40, 'Spilled elements on Page 2 should start from top margin');

console.log('✓ test_canvas_reflow_multipage passed all assertions!');
