import type * as offlineBannerState from '@/features/offline/offline-banner-state';
import * as React from 'react';

const OfflineBannerContext =
  React.createContext<offlineBannerState.OfflineBannerState>(null);

export const OfflineBannerStateProvider = ({
  children,
  state,
}: {
  children: React.ReactNode;
  state: offlineBannerState.OfflineBannerState;
}) => (
  <OfflineBannerContext.Provider value={state}>
    {children}
  </OfflineBannerContext.Provider>
);

export const useOfflineBannerState = () =>
  React.useContext(OfflineBannerContext);

// Visible offline affordances follow the banner, not instantaneous connectivity.
export const useShowOfflineUi = () => useOfflineBannerState() === 'offline';
