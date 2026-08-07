const STATUS_META = Object.freeze({
  AVAILABLE: { label: 'Available', color: 'success' },
  RESERVED: { label: 'Reserved', color: 'warning' },
  BORROWED: { label: 'Borrowed', color: 'processing' },
  DAMAGED: { label: 'Damaged', color: 'error' },
  IN_REPAIR: { label: 'In repair', color: 'warning' },
  RETIRED: { label: 'Retired', color: 'default' },
  PENDING: { label: 'Pending', color: 'warning' },
  PARTIALLY_APPROVED: { label: 'Partially approved', color: 'processing' },
  APPROVED: { label: 'Approved', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'error' },
  COMPLETED: { label: 'Completed', color: 'success' },
  CANCELLED: { label: 'Cancelled', color: 'default' },
  REPORTED: { label: 'Reported', color: 'warning' },
  CONFIRMED: { label: 'Confirmed', color: 'processing' },
  FAILED: { label: 'Failed', color: 'error' },
  ACTIVE: { label: 'Active', color: 'success' },
  INACTIVE: { label: 'Inactive', color: 'default' },
  CURRENT: { label: 'Active', color: 'processing' },
  RETURNED: { label: 'Returned', color: 'success' },
  UNREAD: { label: 'Unread', color: 'warning' },
  READ: { label: 'Read', color: 'default' },
  TOTAL: { label: 'Total', color: 'default' },
});

function normalizeStatus(status) {
  return String(status ?? '').trim().toUpperCase();
}

function humanizeStatus(status) {
  const normalized = normalizeStatus(status);
  if (!normalized) return '—';

  const label = normalized.toLowerCase().replaceAll('_', ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getStatusMeta(status) {
  const normalized = normalizeStatus(status);
  return STATUS_META[normalized] ?? {
    label: humanizeStatus(normalized),
    color: 'default',
  };
}

export function statusLabel(status) {
  return getStatusMeta(status).label;
}

export function statusColor(status) {
  return getStatusMeta(status).color;
}

export function statusTimelineColor(status) {
  return {
    success: 'green',
    warning: 'orange',
    processing: 'blue',
    error: 'red',
    default: 'gray',
  }[statusColor(status)] ?? 'gray';
}

export const ASSET_STATUSES = Object.freeze([
  'AVAILABLE',
  'RESERVED',
  'BORROWED',
  'DAMAGED',
  'IN_REPAIR',
  'RETIRED',
]);

export const BORROW_REQUEST_STATUSES = Object.freeze([
  'PENDING',
  'PARTIALLY_APPROVED',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
]);

export const ASSET_ISSUE_STATUSES = Object.freeze([
  'REPORTED',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'IN_REPAIR',
  'COMPLETED',
  'FAILED',
]);
