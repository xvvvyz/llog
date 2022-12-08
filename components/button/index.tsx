import Link, { LinkProps } from 'next/link';
import { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import Spinner from '/components/spinner';

const sizes = {
  md: 'px-4 py-3 ',
  sm: 'px-2 py-1',
};

const variants = {
  primary:
    'focus-ring inline-flex items-center justify-center gap-3 rounded border border-alpha-2 bg-accent-1 font-bold text-bg-1 no-underline ring-offset-4 ring-offset-bg-2 transition-colors hover:border-alpha-3 hover:enabled:bg-accent-2',
  unstyled: '',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  loading?: boolean;
  loadingText?: string;
  size?: keyof typeof sizes;
  variant?: keyof typeof variants;
}

const Button = ({
  children,
  className,
  disabled = false,
  href,
  loading = false,
  loadingText,
  size = 'md',
  variant = 'primary',
  ...rest
}: ButtonProps) => {
  const cn = twMerge(
    'disabled:cursor-not-allowed disabled:opacity-60',
    variant !== 'unstyled' && sizes[size],
    variants[variant],
    className
  );

  if (href) {
    return (
      <Link className={cn} href={href} {...(rest as Omit<LinkProps, 'href'>)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={cn} disabled={disabled || loading} {...rest}>
      {loading ? (
        <>
          {variant !== 'unstyled' && (
            <Spinner className="border-bg-1 border-l-transparent" />
          )}
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
};

export type { ButtonProps };
export default Button;
