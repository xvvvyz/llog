import Card from 'components/card';
import { notFound } from 'next/navigation';
import createServerSupabaseClient from 'utilities/create-server-supabase-client';
import MissionForm from '../../components/mission-form';

interface PageProps {
  params: {
    missionId: string;
    subjectId: string;
  };
}

const Page = async ({ params: { missionId, subjectId } }: PageProps) => {
  const { data: mission } = await createServerSupabaseClient()
    .from('missions')
    .select('id, name, routines(content, id, name, order, session)')
    .eq('id', missionId)
    .order('order', { ascending: true, foreignTable: 'routines' })
    .single();

  if (!mission) return notFound();

  return (
    <Card breakpoint="sm">
      <MissionForm mission={mission} subjectId={subjectId} />
    </Card>
  );
};

export default Page;
