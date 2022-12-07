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
      'button justify-center gap-4 bg-accent-1 font-bold text-bg-1 ring-offset-4 ring-offset-bg-2 transition-colors hover:enabled:bg-accent-2',
      className
    )}
    disabled={disabled || loading}
    {...rest}
  >
    {loading ? (
      <>
        <div
          aria-label="loading"
          className="h-4 w-4 animate-spin rounded-full border-2 border-bg-1 border-l-transparent"
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
