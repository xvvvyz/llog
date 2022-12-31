import Box, { BoxProps } from 'components/box';
import { twMerge } from 'tailwind-merge';

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
    className={twMerge('flex h-16 items-center justify-between', className)}
    {...rest}
  />
);

export { List, ListItem };
