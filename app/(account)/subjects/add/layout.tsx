import { ReactNode } from 'react';
import BackButton from '/components/back-button';
import Header from '/components/header';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <>
    <Header>
      <BackButton />
      <h1 className="text-2xl font-bold">Add subject</h1>
    </Header>
    {children}
  </>
);

export default Layout;
