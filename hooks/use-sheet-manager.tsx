import { SheetName } from '@/types/sheet-names';
import { usePathname } from 'expo-router';
import { Keyboard } from 'react-native';

import * as React from 'react';

type SheetStackItem = {
  context?: string;
  id?: string;
  name: SheetName;
};

const SheetContext = React.createContext<{
  close: (name: SheetName) => void;
  getContext: (name: SheetName) => string | undefined;
  getId: (name: SheetName) => string | undefined;
  isOpen: (name: SheetName) => boolean;
  open: (name: SheetName, id?: string, context?: string) => void;
  someOpen: () => boolean;
  suspend: () => void;
}>({
  close: () => {},
  getContext: () => undefined,
  getId: () => undefined,
  isOpen: () => false,
  open: () => {},
  someOpen: () => false,
  suspend: () => {},
});

export const SheetManagerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const [sheetStack, setSheetStack] = React.useState<SheetStackItem[]>([]);

  const suspendedRef = React.useRef<{
    pathname: string;
    stack: SheetStackItem[];
  } | null>(null);

  React.useEffect(() => {
    if (suspendedRef.current && pathname === suspendedRef.current.pathname) {
      setSheetStack(suspendedRef.current.stack);
      suspendedRef.current = null;
    }
  }, [pathname]);

  const close = React.useCallback((name: SheetName) => {
    setSheetStack((prev) => {
      const index = prev.findIndex((item) => item.name === name);
      if (index === -1) return prev;
      return prev.slice(0, index);
    });
  }, []);

  const getContext = React.useCallback(
    (name: SheetName) => sheetStack.find((item) => item.name === name)?.context,
    [sheetStack]
  );

  const getId = React.useCallback(
    (name: SheetName) => sheetStack.find((item) => item.name === name)?.id,
    [sheetStack]
  );

  const isOpen = React.useCallback(
    (name: SheetName) => sheetStack[sheetStack.length - 1]?.name === name,
    [sheetStack]
  );

  const open = React.useCallback(
    (name: SheetName, id?: string, context?: string) => {
      Keyboard.dismiss();
      suspendedRef.current = null;

      setSheetStack((prev) => {
        const index = prev.findIndex((item) => item.name === name);
        const newStack = index === -1 ? prev : prev.slice(0, index);
        return [...newStack, { context, name, id }];
      });
    },
    []
  );

  const someOpen = React.useCallback(() => !!sheetStack.length, [sheetStack]);

  const suspend = React.useCallback(() => {
    setSheetStack((prev) => {
      if (!prev.length) return prev;
      suspendedRef.current = { pathname, stack: prev };
      return [];
    });
  }, [pathname]);

  return (
    <SheetContext.Provider
      value={{ close, getContext, getId, isOpen, open, someOpen, suspend }}
    >
      {children}
    </SheetContext.Provider>
  );
};

export const useSheetManager = () => {
  const context = React.useContext(SheetContext);

  if (!context) {
    throw new Error(
      'useSheetManager must be used within a SheetManagerProvider'
    );
  }

  return context;
};
