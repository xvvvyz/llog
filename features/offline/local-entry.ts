export const hasLocalStatus = (
  value: unknown
): value is { localStatus: unknown } =>
  !!value && typeof value === 'object' && 'localStatus' in value;

export const needsIdentityReplay = (
  value: unknown
): value is { needsIdentityReplay: true } =>
  !!(
    value &&
    typeof value === 'object' &&
    'needsIdentityReplay' in value &&
    (value as { needsIdentityReplay?: unknown }).needsIdentityReplay === true
  );
