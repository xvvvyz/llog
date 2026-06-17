import * as React from 'react';

// Native modal routes (presentation: 'transparentModal') are presented above
// the app's root view, so sheet content portaled to the root host renders
// behind them no matter its zIndex. Routes that host sheets register their
// own portal host here, and globally-mounted sheets portal into the topmost
// registered host so they stack above the route's content.
let routeSheetHostNames: string[] = [];
const routeSheetHostListeners = new Set<() => void>();

const emitRouteSheetHostChange = () => {
  for (const listener of routeSheetHostListeners) listener();
};

const subscribeToRouteSheetHosts = (listener: () => void) => {
  routeSheetHostListeners.add(listener);
  return () => routeSheetHostListeners.delete(listener);
};

const getActiveRouteSheetHostName = () =>
  routeSheetHostNames[routeSheetHostNames.length - 1];

export const useRegisterRouteSheetHost = (hostName: string) => {
  React.useEffect(() => {
    routeSheetHostNames = [...routeSheetHostNames, hostName];
    emitRouteSheetHostChange();

    return () => {
      const index = routeSheetHostNames.lastIndexOf(hostName);

      routeSheetHostNames = routeSheetHostNames.filter(
        (_, itemIndex) => itemIndex !== index
      );

      emitRouteSheetHostChange();
    };
  }, [hostName]);
};

export const useActiveRouteSheetHostName = () =>
  React.useSyncExternalStore(
    subscribeToRouteSheetHosts,
    getActiveRouteSheetHostName,
    getActiveRouteSheetHostName
  );
