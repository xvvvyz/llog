'use client';

import Spinner from 'components/spinner';
import Link, { LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

const colorSchemes = {
  accent:
    'ring-accent-2 bg-accent-1 text-bg-1 font-bold hover:bg-accent-2 ring-offset-bg-2 ring-offset-4',
  transparent:
    'ring-fg-2 border-alpha-2 font-normal hover:border-alpha-3 bg-transparent text-fg-2 hover:text-fg-1',
};

const spinnerColorSchemes = {
  accent: 'border-bg-1',
  transparent: 'border-fg-1',
};

const sizes = {
  md: 'px-4 py-2',
  sm: 'px-4 py-1',
};

const variants = {
  link: 'p-3 -m-3 text-fg-2 hover:text-fg-1',
  primary: 'focus:ring-1 justify-center',
};

const disabledVariants = {
  link: 'pointer-events-none opacity-60',
  primary: 'pointer-events-none opacity-60 ring-transparent',
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
    'focus:outline-none border border-transparent inline-flex items-center gap-3 rounded transition-colors',
    variant !== 'link' && sizes[size],
    variant !== 'link' && colorSchemes[colorScheme],
    variants[variant],
    (disabled || loading) && disabledVariants[variant],
    href && pathname?.startsWith(href) && activeClassName,
    className
  );

  if (href) {
    return (
      <Link
        aria-disabled={disabled || loading}
        className={cn}
        href={href}
        {...(rest as Omit<LinkProps, 'href'>)}
      >
        {children}
      </Link>
    );
  }

  return (
    <button className={cn} disabled={disabled || loading} {...rest}>
      {loading ? (
        <>
          {variant !== 'link' && (
            <Spinner
              className={twMerge(
                spinnerColorSchemes[colorScheme],
                'border-l-transparent'
              )}
            />
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
