import { ReactNode } from 'react';
import '../globals.css';

const AppLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default AppLayout;
