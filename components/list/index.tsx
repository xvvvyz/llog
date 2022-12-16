import { twMerge } from 'tailwind-merge';
import Box, { BoxProps } from '/components/box';

const List = ({ className, ...rest }: BoxProps) => (
  <Box
    as="ul"
    className={twMerge(
      'divide-y divide-alpha-1 border-y border-alpha-1',
      className
    )}
    {...rest}
  />
);

const ListItem = ({ className, ...rest }: BoxProps) => (
  <Box
    as="li"
    className={twMerge('flex items-center justify-between py-3', className)}
    {...rest}
  />
);

export { List, ListItem };
