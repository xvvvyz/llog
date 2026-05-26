import * as React from 'react';
import { Keyboard } from 'react-native';
import type * as sheetNames from '@/lib/sheet-names';

type SheetStackItem = {
  context?: string;
  id?: string;
  name: sheetNames.SheetName;
  payload?: unknown;
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

const SheetContext = React.createContext<SheetManager | null>(null);

export const SheetManagerProvider = ({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) => {
  const [sheetStack, setSheetStack] = React.useState<SheetStackItem[]>([]);

  React.useEffect(() => {
    if (!disabled) return;
    setSheetStack((prev) => (prev.length === 0 ? prev : []));
  }, [disabled]);

  const close = React.useCallback((name: sheetNames.SheetName) => {
    setSheetStack((prev) => {
      const index = prev.findIndex((item) => item.name === name);
      if (index === -1) return prev;
      return prev.slice(0, index);
    });
  }, []);

  const getContext = React.useCallback(
    <Name extends sheetNames.SheetName>(name: Name) =>
      sheetStack.find((item) => item.name === name)?.context as
        | sheetNames.SheetContextValue<Name>
        | undefined,
    [sheetStack]
  );

  const getId = React.useCallback(
    (name: sheetNames.SheetName) =>
      sheetStack.find((item) => item.name === name)?.id,
    [sheetStack]
  );

  const getPayload = React.useCallback(
    <Name extends sheetNames.SheetName>(name: Name) =>
      sheetStack.find((item) => item.name === name)?.payload as
        | sheetNames.SheetPayload<Name>
        | undefined,
    [sheetStack]
  );

  const isOpen = React.useCallback(
    (name: sheetNames.SheetName) =>
      sheetStack.some((item) => item.name === name),
    [sheetStack]
  );

  const isTop = React.useCallback(
    (name: sheetNames.SheetName) =>
      sheetStack[sheetStack.length - 1]?.name === name,
    [sheetStack]
  );

  const open = React.useCallback(
    <Name extends sheetNames.SheetName>(
      name: Name,
      id?: string,
      context?: sheetNames.SheetContextValue<Name>,
      payload?: sheetNames.SheetPayload<Name>
    ) => {
      if (disabled) return;
      Keyboard.dismiss();

      setSheetStack((prev) => {
        const index = prev.findIndex((item) => item.name === name);
        const newStack = index === -1 ? prev : prev.slice(0, index);
        return [...newStack, { context, name, id, payload }];
      });
    },
    [disabled]
  );

  return (
    <SheetContext.Provider
      value={{ close, getContext, getId, getPayload, isOpen, isTop, open }}
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
