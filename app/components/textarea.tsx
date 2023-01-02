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
    name={name}
    onChange={onChange}
    placeholder={placeholder}
    ref={ref}
    rows={3}
    value={value}
  />
));

Textarea.displayName = 'Textarea';

export default Textarea;
