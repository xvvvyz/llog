import { cn } from '@/utilities/cn';
import * as React from 'react';
import * as RN from 'react-native';

export function SheetModal({
  children,
  className,
  onOpenChange,
  open,
}: {
  children: React.ReactNode;
  className?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <RN.Modal
      onRequestClose={() => onOpenChange(false)}
      transparent
      visible={open}
    >
      <RN.View className="flex-1 bg-background/80">
        <RN.KeyboardAvoidingView
          behavior={RN.Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <RN.Pressable
            className="flex-1 cursor-default justify-end"
            onPress={() => onOpenChange(false)}
          >
            <RN.Pressable
              className={cn(
                '-mb-96 w-full cursor-default rounded-t-3xl bg-popover pb-96',
                className
              )}
              onPress={(e) => e.stopPropagation()}
            >
              {children}
            </RN.Pressable>
          </RN.Pressable>
        </RN.KeyboardAvoidingView>
      </RN.View>
    </RN.Modal>
  );
}
