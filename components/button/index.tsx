'use client';

import Link, { LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import Spinner from '/components/spinner';

const sizes = {
  md: 'px-4 py-3 ',
  sm: 'px-2 py-1',
};

const variants = {
  primary:
    'ring-accent-1 focus:outline-none focus:ring-1 inline-flex items-center justify-center gap-6 rounded border border-alpha-2 bg-accent-1 font-bold text-bg-1 no-underline ring-offset-4 ring-offset-bg-2 transition-colors hover:border-alpha-3 hover:enabled:bg-accent-2/25',
  unstyled: 'p-3 -m-3 inline-block',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  activeClassName?: string;
  href?: string;
  loading?: boolean;
  loadingText?: string;
  size?: keyof typeof sizes;
  variant?: keyof typeof variants;
}

const Button = ({
  activeClassName,
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
  const pathname = usePathname();

  const cn = twMerge(
    'disabled:cursor-not-allowed disabled:opacity-60',
    variant !== 'unstyled' && sizes[size],
    variants[variant],
    href && pathname?.startsWith(href) && activeClassName,
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
