import Box from 'components/box';
import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface EmptyProps {
  children?: ReactNode;
  className?: string;
}

const Empty = ({ children, className }: EmptyProps) => (
  <Box
    as="p"
    className={twMerge(
      'mt-16 flex flex-col items-center justify-center gap-3 text-fg-2 sm:flex-row sm:gap-6',
      className
    )}
  >
    {children}
  </Box>
);

export default Empty;
