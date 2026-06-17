import { dismissKeyboard } from '@/lib/keyboard';
import * as React from 'react';
import type * as sheetNames from '@/lib/sheet-names';

type SheetStackItem = {
  context?: string;
  id?: string;
  name: sheetNames.SheetName;
  payload?: unknown;
  revision: number;
};

export type SheetManager = {
  close: (name: sheetNames.SheetName) => void;
  getContext: <Name extends sheetNames.SheetName>(
    name: Name
  ) => sheetNames.SheetContextValue<Name> | undefined;
  getId: (name: sheetNames.SheetName) => string | undefined;
  getPayload: <Name extends sheetNames.SheetName>(
    name: Name
  ) => sheetNames.SheetPayload<Name> | undefined;
  isOpen: (name: sheetNames.SheetName) => boolean;
  isTop: (name: sheetNames.SheetName) => boolean;
  open: <Name extends sheetNames.SheetName>(
    name: Name,
    id?: string,
    context?: sheetNames.SheetContextValue<Name>,
    payload?: sheetNames.SheetPayload<Name>
  ) => void;
};

type SheetStore = {
  disabled: boolean;
  getStack: () => SheetStackItem[];
  setStack: (updater: (stack: SheetStackItem[]) => SheetStackItem[]) => void;
  subscribe: (listener: () => void) => () => void;
};

let nextSheetRevision = 0;

const createSheetStore = (): SheetStore => {
  let stack: SheetStackItem[] = [];
  const listeners = new Set<() => void>();

  return {
    disabled: false,
    getStack: () => stack,
    setStack: (updater) => {
      const next = updater(stack);
      if (next === stack) return;
      stack = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

// Tracked keys: `o:<name>` (isOpen), `t:<name>` (isTop), `i:<name>` (the
// stack item read by getId/getContext/getPayload, fingerprinted by the
// revision stamped on each open()).
const readSheetStackKey = (stack: SheetStackItem[], key: string) => {
  const name = key.slice(2);

  switch (key[0]) {
    case 'o': {
      return stack.some((item) => item.name === name) ? '1' : '0';
    }

    case 't': {
      return stack[stack.length - 1]?.name === name ? '1' : '0';
    }

    default: {
      const item = stack.find((stackItem) => stackItem.name === name);
      return item ? String(item.revision) : '';
    }
  }
};

const createSheetManager = (
  store: SheetStore,
  trackedKeys: Set<string>
): SheetManager => {
  const findItem = (name: sheetNames.SheetName) => {
    trackedKeys.add(`i:${name}`);
    return store.getStack().find((item) => item.name === name);
  };

  return {
    close: (name) => {
      dismissKeyboard({ immediate: true });

      store.setStack((stack) => {
        const index = stack.findIndex((item) => item.name === name);
        if (index === -1) return stack;
        return stack.slice(0, index);
      });
    },
    getContext: <Name extends sheetNames.SheetName>(name: Name) =>
      findItem(name)?.context as sheetNames.SheetContextValue<Name> | undefined,
    getId: (name) => findItem(name)?.id,
    getPayload: <Name extends sheetNames.SheetName>(name: Name) =>
      findItem(name)?.payload as sheetNames.SheetPayload<Name> | undefined,
    isOpen: (name) => {
      trackedKeys.add(`o:${name}`);
      return store.getStack().some((item) => item.name === name);
    },
    isTop: (name) => {
      trackedKeys.add(`t:${name}`);
      const stack = store.getStack();
      return stack[stack.length - 1]?.name === name;
    },
    open: <Name extends sheetNames.SheetName>(
      name: Name,
      id?: string,
      context?: sheetNames.SheetContextValue<Name>,
      payload?: sheetNames.SheetPayload<Name>
    ) => {
      if (store.disabled) return;
      dismissKeyboard();

      store.setStack((stack) => {
        const index = stack.findIndex((item) => item.name === name);
        const newStack = index === -1 ? stack : stack.slice(0, index);

        return [
          ...newStack,
          { context, name, id, payload, revision: ++nextSheetRevision },
        ];
      });
    },
  };
};

const SheetContext = React.createContext<SheetStore | null>(null);

export const SheetManagerProvider = ({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) => {
  const [store] = React.useState(createSheetStore);
  store.disabled = !!disabled;

  React.useEffect(() => {
    if (!disabled) return;
    store.setStack((stack) => (stack.length === 0 ? stack : []));
  }, [disabled, store]);

  return (
    <SheetContext.Provider value={store}>{children}</SheetContext.Provider>
  );
};

// The manager identity and its methods are stable for the provider's
// lifetime. Reads during render are tracked per name, and the component
// re-renders only when a sheet it actually read changes — opening one sheet
// no longer re-renders every useSheetManager consumer in the app.
export const useSheetManager = (): SheetManager => {
  const store = React.useContext(SheetContext);

  if (!store) {
    throw new Error(
      'useSheetManager must be used within a SheetManagerProvider'
    );
  }

  const [trackedKeys] = React.useState(() => new Set<string>());

  const getFingerprint = React.useCallback(() => {
    const stack = store.getStack();
    let fingerprint = '';

    for (const key of trackedKeys) {
      fingerprint += `${key}=${readSheetStackKey(stack, key)};`;
    }

    return fingerprint;
  }, [store, trackedKeys]);

  React.useSyncExternalStore(store.subscribe, getFingerprint, getFingerprint);

  return React.useMemo(
    () => createSheetManager(store, trackedKeys),
    [store, trackedKeys]
  );
};
