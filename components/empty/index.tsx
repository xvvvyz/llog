import { ReactNode } from 'react';
import Box from '/components/box';

interface EmptyProps {
  children?: ReactNode;
}

const Empty = ({ children }: EmptyProps) => (
  <Box as="p" className="mt-16 text-center text-fg-2">
    {children}
  </Box>
);

export default Empty;
