import Box from 'components/box';
import { ReactNode } from 'react';

interface EmptyProps {
  children?: ReactNode;
}

const Empty = ({ children }: EmptyProps) => (
  <Box as="p" className="mt-16 text-center text-fg-2">
    {children}
  </Box>
);

export default Empty;
