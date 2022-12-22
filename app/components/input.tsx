import { forwardRef, InputHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...rest }, ref) => (
  <input
    className={twMerge(
      'w-full rounded border border-alpha-2 bg-alpha-1 px-4 py-2 text-fg-1 hover:border-alpha-3 focus:outline-none focus:ring-1 focus:ring-accent-2 disabled:cursor-not-allowed disabled:opacity-60',
      className
    )}
    ref={ref}
    {...rest}
  />
));

Input.displayName = 'Input';

export default Input;
