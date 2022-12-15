'use client';

import Link, { LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import Spinner from '/components/spinner';

const colorSchemes = {
  accent:
    'ring-accent-2 focus:ring-1 bg-accent-1 text-bg-1 hover:bg-accent-2 ring-offset-bg-2 ring-offset-4',
  alpha: 'bg-alpha-fg-1 text-fg-1 hover:bg-alpha-fg-2',
};

const sizes = {
  md: 'px-4 py-3 ',
  sm: 'px-4 py-1',
};

const variants = {
  primary:
    'inline-flex items-center justify-center gap-6 rounded border border-alpha-fg-2 font-bold no-underline transition-colors hover:border-alpha-fg-3',
  unstyled: 'p-3 -m-3 inline-block',
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
