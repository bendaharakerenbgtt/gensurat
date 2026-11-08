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
