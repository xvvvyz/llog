import { ReactNode } from 'react';
import BackButton from '/components/back-button';
import Header from '/components/header';

interface LayoutProps {
  children: ReactNode;
  params: {
    id: string;
  };
}

const Layout = ({ children, params: { id } }: LayoutProps) => (
  <>
    <Header>
      <BackButton />
      <h1>Edit subject</h1>
    </Header>
    {children}
  </>
);

export default Layout;
