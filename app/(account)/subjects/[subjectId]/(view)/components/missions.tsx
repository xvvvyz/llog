import Button from 'components/button';
import Empty from 'components/empty';
import { List, ListItem } from 'components/list';
import createServerSupabaseClient from 'utilities/create-server-supabase-client';

interface MissionProps {
  subjectId: string;
}

const Missions = async ({ subjectId }: MissionProps) => {
  const { data: missions } = await createServerSupabaseClient()
    .from('missions')
    .select('id, name')
    .eq('subject_id', subjectId);

  if (!missions?.length) return <Empty>No missions</Empty>;

  return (
    <List>
      {missions.map((mission) => (
        <ListItem key={mission.id}>
          <Button className="w-3/4 truncate" variant="link">
            {mission.name}
          </Button>
          <Button
            colorScheme="bg"
            href={`/subjects/${subjectId}/missions/${mission.id}/edit`}
            size="sm"
          >
            Edit
          </Button>
        </ListItem>
      ))}
    </List>
  );
};

export default Missions;
