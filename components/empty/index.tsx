import { ReactNode } from 'react';
import Box from '/components/box';

interface EmptyProps {
  children?: ReactNode;
}

const Empty = ({ children }: EmptyProps) => (
  <Box as="p" className="text-center text-fg-3">
    {children}
  </Box>
);

export default Empty;
