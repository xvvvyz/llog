import { forwardRef, TextareaHTMLAttributes } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { twMerge } from 'tailwind-merge';

const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ autoFocus, className, name, onChange, placeholder, value }, ref) => (
  <TextareaAutosize
    autoFocus={autoFocus}
    className={twMerge('input', className)}
    minRows={2}
    name={name}
    onChange={onChange}
    placeholder={placeholder}
    ref={ref}
    value={value}
  />
));

Textarea.displayName = 'Textarea';

export default Textarea;
