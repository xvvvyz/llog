import Button from 'components/button';
import Header from 'components/header';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <>
    <Header>
      <h1 className="text-2xl">Subjects</h1>
      <Button href="/subjects/add" size="sm">
        Add subject
      </Button>
    </Header>
    <main>{children}</main>
  </>
);

export default Layout;
