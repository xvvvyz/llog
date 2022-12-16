'use client';

import Link, { LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import Spinner from '/components/spinner';

const colorSchemes = {
  accent:
    'ring-accent-2 bg-accent-1 text-bg-1 font-bold hover:bg-accent-2 ring-offset-bg-2 ring-offset-4',
  bg: 'ring-fg-1 border border-alpha-2 font-normal hover:border-alpha-3 bg-bg-1 text-fg-1 hover:bg-bg-2',
};

const sizes = {
  md: 'px-4 h-12',
  sm: 'px-4 h-9',
};

const variants = {
  primary:
    'focus:ring-1 inline-flex items-center justify-center gap-6 rounded transition-colors',
  unstyled: 'p-3 -m-3 inline-block text-left',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  activeClassName?: string;
  colorScheme?: keyof typeof colorSchemes;
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
  colorScheme = 'accent',
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
    'focus:outline-none disabled:cursor-not-allowed rounded disabled:opacity-60',
    variant !== 'unstyled' && sizes[size],
    variant !== 'unstyled' && colorSchemes[colorScheme],
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
