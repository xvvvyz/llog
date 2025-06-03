import { SheetName } from '@/types/sheet-names';
import { Keyboard } from 'react-native';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';

type SheetStackItem = {
  name: SheetName;
  id?: string;
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
  const [sheetStack, setSheetStack] = useState<SheetStackItem[]>([]);

  const close = useCallback((name: SheetName) => {
    setSheetStack((prev) => {
      const index = prev.findIndex((item) => item.name === name);
      if (index === -1) return prev;
      return prev.slice(0, index);
    });
  }, []);

  const getId = useCallback(
    (name: SheetName) => sheetStack.find((item) => item.name === name)?.id,
    [sheetStack]
  );

  const isOpen = useCallback(
    (name: SheetName) => sheetStack[sheetStack.length - 1]?.name === name,
    [sheetStack]
  );

  const open = useCallback((name: SheetName, id?: string) => {
    Keyboard.dismiss();

    setSheetStack((prev) => {
      const index = prev.findIndex((item) => item.name === name);
      const newStack = index === -1 ? prev : prev.slice(0, index);
      return [...newStack, { name, id }];
    });
  }, []);

  const someOpen = useCallback(() => !!sheetStack.length, [sheetStack]);

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
