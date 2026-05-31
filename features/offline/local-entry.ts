type LocalStatus = 'error' | 'pending';

export const hasLocalStatus = <T>(
  value: T
): value is T & { localStatus: LocalStatus } => {
  if (!value || typeof value !== 'object') return false;
  const status = (value as { localStatus?: unknown }).localStatus;
  return status === 'pending' || status === 'error';
};

export const needsIdentityReplay = (
  value: unknown
): value is { needsIdentityReplay: true } =>
  !!(
    value &&
    typeof value === 'object' &&
    'needsIdentityReplay' in value &&
    (value as { needsIdentityReplay?: unknown }).needsIdentityReplay === true
  );
