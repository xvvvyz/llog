import { ReactNode } from 'react';
import Nav from '/components/nav';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <div className="mx-auto flex max-w-lg flex-col justify-center gap-12 px-6 pb-12 pt-6 xs:pt-12">
    <Nav />
    {children}
  </div>
);

export default Layout;
