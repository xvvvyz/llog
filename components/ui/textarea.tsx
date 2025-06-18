import { Input } from '@/components/ui/input';
import { cn } from '@/utilities/ui/utils';
import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from 'react';
import { TextInput } from 'react-native';

const Textarea = forwardRef<
  ComponentRef<typeof TextInput>,
  ComponentPropsWithoutRef<typeof TextInput>
>(({ className, value, ...props }, ref) => (
  <Input
    className={cn('h-auto flex-1 py-2.5', className)}
    multiline
    numberOfLines={12}
    ref={ref}
    returnKeyType="default"
    submitBehavior="newline"
    textAlignVertical="top"
    value={value}
    {...props}
  />
));

Textarea.displayName = 'Textarea';

export { Textarea };
