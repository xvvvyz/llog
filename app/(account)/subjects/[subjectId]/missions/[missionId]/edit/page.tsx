import MissionForm from '(account)/subjects/[subjectId]/missions/components/mission-form';
import Card from 'components/card';
import { notFound } from 'next/navigation';
import createServerSupabaseClient from 'utilities/create-server-supabase-client';

interface PageProps {
  params: {
    missionId: string;
    subjectId: string;
  };
}

const Page = async ({ params: { missionId, subjectId } }: PageProps) => {
  const { data: mission } = await createServerSupabaseClient()
    .from('missions')
    .select('id, name')
    .eq('id', missionId)
    .single();

  if (!mission) return notFound();

  return (
    <Card breakpoint="sm">
      <MissionForm mission={mission} subjectId={subjectId} />
    </Card>
  );
};

export default Page;
