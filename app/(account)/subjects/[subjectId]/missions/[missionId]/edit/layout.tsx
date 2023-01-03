import BackButton from 'components/back-button';
import Header from 'components/header';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  params: {
    subjectId: string;
  };
}

const Layout = ({ children, params: { subjectId } }: LayoutProps) => (
  <>
    <Header>
      <BackButton href={`/subjects/${subjectId}`} />
      <h1 className="text-2xl">Edit mission</h1>
    </Header>
    <main>{children}</main>
  </>
);

export default Layout;
