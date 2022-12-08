import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <main className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-9 py-12 px-9">
    {children}
  </main>
);

export default Layout;
