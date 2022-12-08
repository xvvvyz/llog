import { ReactNode } from 'react';
import BackButton from '/components/back-button';
import Button from '/components/button';
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
      <Button href={`/subjects/${id}/edit`} size="sm">
        Edit subject
      </Button>
    </Header>
    {children}
  </>
);

export default Layout;
