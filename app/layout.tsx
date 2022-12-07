import { Figtree } from '@next/font/google';
import { ReactNode } from 'react';
import '../globals.css';

const figtree = Figtree({ subsets: ['latin'] });

const AppLayout = ({ children }: { children: ReactNode }) => (
  <html className={figtree.className} lang="en">
    <body>{children}</body>
  </html>
);

export default AppLayout;
