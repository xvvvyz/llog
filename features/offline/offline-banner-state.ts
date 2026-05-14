export type OfflineBannerState = 'offline' | 'syncing' | null;

export const getNextOfflineBannerState = ({
  currentState,
  hasPendingWork,
  isNetworkOffline,
  outboxHydrated,
  showOffline,
}: {
  currentState: OfflineBannerState;
  hasPendingWork: boolean;
  isNetworkOffline: boolean;
  outboxHydrated: boolean;
  showOffline: boolean;
}): OfflineBannerState => {
  if (showOffline) return 'offline';
  if (isNetworkOffline) return currentState;

  if (
    (currentState === 'offline' && (hasPendingWork || !outboxHydrated)) ||
    (currentState === 'syncing' && hasPendingWork)
  ) {
    return 'syncing';
  }

  return null;
};
