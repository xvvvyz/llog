import BackButton from 'components/back-button';
import Header from 'components/header';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <>
    <Header>
      <BackButton href="/observations" />
      <h1 className="text-2xl">Edit observation type</h1>
    </Header>
    <main>{children}</main>
  </>
);

export default Layout;
