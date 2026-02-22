const ALLOWED_STATUS_VALUES = ['PENDING', 'APPROVED', 'PRINTING', 'DONE', 'FAILED', 'REJECTED'];
const ALLOWED_STATUS_UPDATES = ['PRINTING', 'DONE', 'FAILED'];
const STATUS_TRANSITIONS = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['PRINTING'],
  PRINTING: ['DONE', 'FAILED'],
  DONE: [],
  FAILED: [],
  REJECTED: []
};

function canTransition(currentStatus, nextStatus) {
  const allowed = STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

module.exports = {
  ALLOWED_STATUS_VALUES,
  ALLOWED_STATUS_UPDATES,
  STATUS_TRANSITIONS,
  canTransition
};
