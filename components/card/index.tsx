import { twMerge } from 'tailwind-merge';
import Box, { BoxProps } from '/components/box';

const sizes = {
  'base:md': 'p-9',
  'base:sm': 'p-6',
  'xs:md': 'xs:p-9',
  'xs:sm': 'p-6',
};

const variants = {
  'base:default': 'border border-alpha-1 bg-bg-2',
  'xs:default': 'xs:border xs:border-alpha-1 xs:bg-bg-2',
};

interface CardProps extends BoxProps {
  breakpoint?: 'base' | 'xs';
  size?: 'md' | 'sm';
  variant?: 'default';
}

const Card = ({
  breakpoint = 'base',
  className,
  size = 'md',
  variant = 'default',
  ...rest
}: CardProps) => (
  <Box
    className={twMerge(
      'w-full rounded',
      sizes[`${breakpoint}:${size}`],
      variants[`${breakpoint}:${variant}`],
      className
    )}
    {...rest}
  />
);

export default Card;
