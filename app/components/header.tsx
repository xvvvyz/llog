import Box, { BoxProps } from 'components/box';
import { twMerge } from 'tailwind-merge';

const Header = ({ className, ...rest }: BoxProps) => (
  <Box
    as="header"
    className={twMerge(
      'mt-16 mb-9 flex h-10 items-center justify-between',
      className
    )}
    {...rest}
  />
);

export default Header;
