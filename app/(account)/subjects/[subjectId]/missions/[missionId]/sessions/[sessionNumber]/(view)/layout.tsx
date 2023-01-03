import BackButton from 'components/back-button';
import Header from 'components/header';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';
import SessionPaginator from './components/session-paginator';
import getMission from './utilities/get-mission';

interface LayoutProps {
  children: ReactNode;
  params: {
    missionId: string;
    sessionNumber: string;
    subjectId: string;
  };
}

const Layout = async ({
  children,
  params: { missionId, sessionNumber, subjectId },
}: LayoutProps) => {
  const { data: mission } = await getMission(missionId);
  if (!mission) return notFound();

  return (
    <>
      <header>
        <Header as="div">
          <BackButton href={`/subjects/${subjectId}`} />
          <h1 className="text-2xl">{mission.name}</h1>
        </Header>
        {/* @ts-expect-error Server Component */}
        <SessionPaginator
          missionId={missionId}
          sessionNumber={Number(sessionNumber)}
          subjectId={subjectId}
        />
      </header>
      <main>{children}</main>
    </>
  );
};

export default Layout;
