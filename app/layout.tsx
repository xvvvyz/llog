import { Figtree } from '@next/font/google';
import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import '../globals.css';

const figtree = Figtree({ subsets: ['latin'] });

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <html
    className={twMerge(
      'h-full text-[4.29vw] xs:text-[15px]',
      figtree.className
    )}
    lang="en"
  >
    <body className="h-full bg-bg-1 leading-snug text-fg-1">{children}</body>
  </html>
);

export default Layout;
