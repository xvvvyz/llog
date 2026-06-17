import * as React from 'react';

const OverlayPortalHostContext = React.createContext<string | undefined>(
  undefined
);

export const OverlayPortalHostProvider = ({
  children,
  hostName,
}: {
  children: React.ReactNode;
  hostName?: string;
}) => (
  <OverlayPortalHostContext.Provider value={hostName}>
    {children}
  </OverlayPortalHostContext.Provider>
);

export const useOverlayPortalHostName = () =>
  React.useContext(OverlayPortalHostContext);
