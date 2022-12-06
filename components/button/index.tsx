import clsx from 'clsx';
import { ButtonHTMLAttributes } from 'react';

const Button = ({
  children,
  className,
  disabled = false,
  loading = false,
  loadingText,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
}) => (
  <button
    className={clsx(
      'button justify-center gap-4 bg-accent-1 text-accent-fg-1 transition-colors hover:enabled:bg-accent-2',
      className
    )}
    disabled={disabled || loading}
    {...rest}
  >
    {loading ? (
      <>
        <div
          aria-label="loading"
          className="border-l-transparent h-4 w-4 animate-spin rounded-full border-2 border-accent-fg-1"
          role="status"
        />
        {loadingText}
      </>
    ) : (
      children
    )}
  </button>
);

export default Button;
