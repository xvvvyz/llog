import { SheetName } from '@/types/sheet-names';
import { Keyboard } from 'react-native';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';

type SheetState = {
  id: string;
  isOpen: boolean;
};

const SheetContext = createContext<{
  close: (name: SheetName) => void;
  getId: (name: SheetName) => string | undefined;
  isOpen: (name: SheetName) => boolean;
  open: (name: SheetName, id?: string) => void;
  someOpen: () => boolean;
}>({
  close: () => {},
  isOpen: () => false,
  open: () => {},
  getId: () => undefined,
  someOpen: () => false,
});

export const SheetManagerProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<Record<SheetName, SheetState>>(
    {} as Record<SheetName, SheetState>
  );

  const close = useCallback(
    (name: SheetName) =>
      setState((prev) => ({ ...prev, [name]: { isOpen: false } })),
    []
  );

  const getId = useCallback((name: SheetName) => state[name]?.id, [state]);

  const isOpen = useCallback(
    (name: SheetName) => state[name]?.isOpen ?? false,
    [state]
  );

  const open = useCallback((name: SheetName, id?: string) => {
    Keyboard.dismiss();
    setState((prev) => ({ ...prev, [name]: { isOpen: true, id } }));
  }, []);

  const someOpen = useCallback(
    () => Object.values(state).some((sheet) => sheet.isOpen),
    [state]
  );

  return (
    <SheetContext.Provider value={{ close, getId, isOpen, open, someOpen }}>
      {children}
    </SheetContext.Provider>
  );
};

export const useSheetManager = () => {
  const context = useContext(SheetContext);

  if (!context) {
    throw new Error(
      'useSheetManager must be used within a SheetManagerProvider'
    );
  }

  return context;
};
