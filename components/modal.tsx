import { View } from '@/components/ui/view';
import { cn } from '@/utilities/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable } from 'react-native';

const modalVariants = cva(
  'w-full cursor-default border border-border bg-popover',
  {
    defaultVariants: {
      variant: 'sheet',
    },
    variants: {
      variant: {
        alert: 'max-w-md rounded-lg',
        sheet: 'rounded-t-3xl border-b-0',
      },
    },
  }
);

type ModalProps = {
  children: ReactNode;
  className?: string;
  onClose: () => void;
} & VariantProps<typeof modalVariants>;

export const Modal = ({
  children,
  className,
  onClose,
  variant = 'sheet',
}: ModalProps) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className={cn(
        'flex-1 cursor-default items-center',
        variant === 'alert' ? 'justify-center p-4' : 'justify-end'
      )}
    >
      <Pressable className="absolute inset-0" onPress={onClose} />
      <View className={cn(modalVariants({ variant, className }))}>
        {children}
      </View>
      {variant === 'sheet' && (
        <View className="absolute -bottom-[1000px] left-0 right-0 h-[1000px] bg-popover" />
      )}
    </KeyboardAvoidingView>
  );
};

Modal.displayName = 'Modal';
