import Button from 'components/button';
import Empty from 'components/empty';
import { List, ListItem } from 'components/list';
import createServerSupabaseClient from 'utilities/create-server-supabase-client';
import forceArray from 'utilities/force-array';

interface MissionProps {
  subjectId: string;
}

const Missions = async ({ subjectId }: MissionProps) => {
  const { data: missions } = await createServerSupabaseClient()
    .from('missions')
    .select('id, name, routines(events(id), session)')
    .eq('subject_id', subjectId)
    .order('order', { ascending: true, foreignTable: 'routines' });

  if (!missions?.length) return <Empty>No missions</Empty>;

  return (
    <List>
      {missions.map((mission) => {
        const routines = forceArray(mission.routines);

        const activeSessionNumber =
          (routines.length
            ? routines.find((routine) => !routine.events.length)?.session ??
              routines.pop().session
            : 0) + 1;

        return (
          <ListItem key={mission.id}>
            <Button
              className="h-full w-3/4 truncate"
              href={`/subjects/${subjectId}/missions/${mission.id}/sessions/${activeSessionNumber}`}
              variant="link"
            >
              {mission.name}
            </Button>
            <Button
              colorScheme="transparent"
              href={`/subjects/${subjectId}/missions/${mission.id}/edit`}
              size="sm"
            >
              Edit
            </Button>
          </ListItem>
        );
      })}
    </List>
  );
};

export default Missions;
