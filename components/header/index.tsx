import { twMerge } from 'tailwind-merge';
import Box, { BoxProps } from '/components/box';

const Header = ({ className, ...rest }: BoxProps) => (
  <Box
    as="header"
    className={twMerge(
      'mt-16 mb-9 flex h-9 items-center justify-between',
      className
    )}
    {...rest}
  />
);

export default Header;
