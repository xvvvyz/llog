import { forwardRef, InputHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...rest }, ref) => (
  <input
    className={twMerge(
      'w-full rounded border border-alpha-fg-2 bg-alpha-fg-1 px-4 py-3 text-fg-1 ring-accent-2 ring-offset-4 ring-offset-bg-2 hover:border-alpha-fg-3 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60',
      className
    )}
    ref={ref}
    {...rest}
  />
));

Input.displayName = 'Input';

export default Input;
