import Box, { BoxProps } from 'components/box';
import { twMerge } from 'tailwind-merge';

const sizes = {
  'base:md': 'p-9',
  'base:sm': 'p-6',
  'sm:md': 'sm:p-9',
  'sm:sm': 'p-6',
};

const variants = {
  'base:default': 'border border-alpha-1 bg-bg-2',
  'sm:default': 'sm:border sm:border-alpha-1 sm:bg-bg-2',
};

interface CardProps extends BoxProps {
  breakpoint?: 'base' | 'sm';
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
