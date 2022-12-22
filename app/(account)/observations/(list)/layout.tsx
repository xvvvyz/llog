import Button from 'components/button';
import Header from 'components/header';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <>
    <Header>
      <h1 className="text-2xl">Observations</h1>
      <Button href="/observations/add" size="sm">
        Add type
      </Button>
    </Header>
    <main>{children}</main>
  </>
);

export default Layout;
