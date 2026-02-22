const test = require('node:test');
const assert = require('node:assert/strict');

const { DONE_RETENTION_MINUTES, getDoneCutoffIso, isDoneJobExpired } = require('../src/services/jobCleanup');

test('getDoneCutoffIso uses configured retention window', () => {
  const now = Date.UTC(2026, 1, 22, 10, 0, 0);
  const cutoff = new Date(getDoneCutoffIso(now)).getTime();
  const expected = now - DONE_RETENTION_MINUTES * 60 * 1000;
  assert.equal(cutoff, expected);
});

test('isDoneJobExpired returns true only for old DONE timestamps', () => {
  const now = Date.UTC(2026, 1, 22, 10, 0, 0);
  const oldTs = new Date(now - (DONE_RETENTION_MINUTES + 1) * 60 * 1000).toISOString();
  const recentTs = new Date(now - Math.max(DONE_RETENTION_MINUTES - 1, 0) * 60 * 1000).toISOString();

  assert.equal(isDoneJobExpired(oldTs, now), true);
  assert.equal(isDoneJobExpired(recentTs, now), false);
  assert.equal(isDoneJobExpired('bad-date', now), false);
  assert.equal(isDoneJobExpired('', now), false);
});
