import { ReactNode } from 'react';
import BackButton from '../../../../components/back-button';
import Header from '../../../../components/header';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <>
    <Header>
      <BackButton href="/subjects" />
      <h1 className="text-2xl">Edit subject</h1>
    </Header>
    <main>{children}</main>
  </>
);

export default Layout;