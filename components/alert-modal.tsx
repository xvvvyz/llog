import { Text } from '@/components/text';
import { cn } from '@/utilities/cn';
import * as React from 'react';
import * as RN from 'react-native';

const Root = React.forwardRef<
  RN.View,
  {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
  }
>(({ open, onOpenChange, children }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const controlled = open !== undefined;

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      if (!controlled) setIsOpen(value);
      onOpenChange?.(value);
    },
    [controlled, onOpenChange]
  );

  return (
    <ModalContext.Provider
      value={{
        open: controlled ? open : isOpen,
        onOpenChange: handleOpenChange,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
});

Root.displayName = 'Root';

const ModalContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => {},
});

const Content = React.forwardRef<
  RN.View,
  {
    children: React.ReactNode;
    className?: string;
  }
>(({ children, className }, ref) => {
  const { open, onOpenChange } = React.useContext(ModalContext);

  return (
    <RN.Modal onRequestClose={() => onOpenChange(false)} visible={open}>
      <RN.Pressable
        className="flex-1 cursor-default items-center justify-center bg-background p-4"
        onPress={() => onOpenChange(false)}
      >
        <RN.Pressable
          ref={ref}
          className={cn(
            'w-full max-w-lg cursor-default rounded-lg border border-border bg-popover p-6',
            className
          )}
          onPress={(e) => e.stopPropagation()}
        >
          {children}
        </RN.Pressable>
      </RN.Pressable>
    </RN.Modal>
  );
});

Content.displayName = 'Content';

const Header = React.forwardRef<
  RN.View,
  {
    children: React.ReactNode;
    className?: string;
  }
>(({ children, className }, ref) => (
  <RN.View ref={ref} className={cn('', className)}>
    {children}
  </RN.View>
));

Header.displayName = 'Header';

const Footer = React.forwardRef<
  RN.View,
  {
    children: React.ReactNode;
    className?: string;
  }
>(({ children, className }, ref) => (
  <RN.View
    ref={ref}
    className={cn('mt-4 flex-row justify-end gap-4', className)}
  >
    {children}
  </RN.View>
));

Footer.displayName = 'Footer';

const Title = React.forwardRef<
  RN.View,
  {
    children: React.ReactNode;
    className?: string;
  }
>(({ children, className }, ref) => (
  <RN.View ref={ref} className={cn('mb-4', className)}>
    <Text className="text-3xl">{children}</Text>
  </RN.View>
));

Title.displayName = 'Title';

const Description = React.forwardRef<
  RN.View,
  {
    children: React.ReactNode;
    className?: string;
  }
>(({ children, className }, ref) => (
  <RN.View ref={ref} className={cn('mb-4', className)}>
    <Text className="text-muted-foreground">{children}</Text>
  </RN.View>
));

Description.displayName = 'Description';

export { Content, Description, Footer, Header, Root, Title };
