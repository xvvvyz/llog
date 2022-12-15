import { ReactNode } from 'react';
import Nav from '/components/nav';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <div className="mx-auto max-w-lg px-6 pb-24 pt-9">
    <Nav />
    {children}
  </div>
);

export default Layout;
