import { Figtree } from '@next/font/google';
import { ReactNode } from 'react';
import '../globals.css';

const figtree = Figtree({ subsets: ['latin'] });

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <html className={figtree.className} lang="en">
    <body>{children}</body>
  </html>
);

export default Layout;
