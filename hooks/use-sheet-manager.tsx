import { SheetName } from '@/types/sheet-names';
import * as React from 'react';
import { Keyboard } from 'react-native';

type SheetStackItem = {
  context?: string;
  id?: string;
  name: SheetName;
  payload?: unknown;
};

export type SheetManager = {
  close: (name: SheetName) => void;
  getContext: (name: SheetName) => string | undefined;
  getId: (name: SheetName) => string | undefined;
  getPayload: (name: SheetName) => unknown;
  isOpen: (name: SheetName) => boolean;
  open: (
    name: SheetName,
    id?: string,
    context?: string,
    payload?: unknown
  ) => void;
};

const SheetContext = React.createContext<SheetManager | null>(null);

export const SheetManagerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [sheetStack, setSheetStack] = React.useState<SheetStackItem[]>([]);

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

  const getPayload = React.useCallback(
    (name: SheetName) => sheetStack.find((item) => item.name === name)?.payload,
    [sheetStack]
  );

  const isOpen = React.useCallback(
    (name: SheetName) => sheetStack[sheetStack.length - 1]?.name === name,
    [sheetStack]
  );

  const open = React.useCallback(
    (name: SheetName, id?: string, context?: string, payload?: unknown) => {
      Keyboard.dismiss();

      setSheetStack((prev) => {
        const index = prev.findIndex((item) => item.name === name);
        const newStack = index === -1 ? prev : prev.slice(0, index);
        return [...newStack, { context, name, id, payload }];
      });
    },
    []
  );

  return (
    <SheetContext.Provider
      value={{ close, getContext, getId, getPayload, isOpen, open }}
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
