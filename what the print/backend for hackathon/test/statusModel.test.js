const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ALLOWED_STATUS_VALUES,
  ALLOWED_STATUS_UPDATES,
  canTransition
} = require('../src/lib/statusModel');

test('status values include REJECTED', () => {
  assert.equal(ALLOWED_STATUS_VALUES.includes('REJECTED'), true);
});

test('allowed status updates from /status endpoint stay worker-only', () => {
  assert.deepEqual(ALLOWED_STATUS_UPDATES, ['PRINTING', 'DONE', 'FAILED']);
});

test('valid transitions pass', () => {
  assert.equal(canTransition('PENDING', 'APPROVED'), true);
  assert.equal(canTransition('PENDING', 'REJECTED'), true);
  assert.equal(canTransition('APPROVED', 'PRINTING'), true);
  assert.equal(canTransition('PRINTING', 'DONE'), true);
  assert.equal(canTransition('PRINTING', 'FAILED'), true);
});

test('invalid transitions are blocked', () => {
  assert.equal(canTransition('REJECTED', 'APPROVED'), false);
  assert.equal(canTransition('DONE', 'PRINTING'), false);
  assert.equal(canTransition('PENDING', 'DONE'), false);
  assert.equal(canTransition('APPROVED', 'DONE'), false);
});
