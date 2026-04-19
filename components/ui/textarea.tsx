import { Input } from '@/components/ui/input';
import { cn } from '@/utilities/cn';
import * as React from 'react';
import { TextInput } from 'react-native';

const Textarea = React.forwardRef<
  React.ComponentRef<typeof TextInput>,
  React.ComponentPropsWithoutRef<typeof TextInput>
>(({ className, value, ...props }, ref) => (
  <Input
    className={cn('h-auto py-2.5', className)}
    lineBreakModeIOS="wordWrapping"
    multiline
    ref={ref}
    returnKeyType="default"
    scrollEnabled
    submitBehavior="newline"
    textAlignVertical="top"
    value={value}
    {...props}
  />
));

Textarea.displayName = 'Textarea';

export { Textarea };
