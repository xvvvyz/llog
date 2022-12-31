import Empty from 'components/empty';
import createServerSupabaseClient from 'utilities/create-server-supabase-client';
import Card from '../../../../../components/card';
import firstIfArray from '../../../../../utilities/first-if-array';

interface TimelineProps {
  subjectId: string;
}

const Timeline = async ({ subjectId }: TimelineProps) => {
  const { data: events } = await createServerSupabaseClient()
    .from('events')
    .select(
      'created_at, id, observation:observations(id, name), routine:routines(id, name)'
    )
    .order('created_at', { ascending: false })
    .eq('subject_id', subjectId);

  if (!events?.length) return <Empty>No events</Empty>;

  return (
    <ul className="-mt-6 flex flex-col gap-3">
      {Object.entries(
        events.reduce((acc, event) => {
          const date = new Date(event.created_at).toLocaleDateString('en-US', {
            dateStyle: 'long',
          });

          acc[date] = acc[date] ?? [];
          acc[date].push(event);
          return acc;
        }, {} as Record<string, typeof events>)
      ).map(([date, events]) => (
        <li className="flex flex-col gap-3" key={date}>
          <div className="ml-6 flex h-16 items-end justify-end border-l-2 border-dashed border-alpha-2 text-fg-2">
            {date}
          </div>
          {events.map((event) => {
            const observation = firstIfArray(event.observation);

            if (observation) {
              return (
                <Card key={event.id} size="sm">
                  {observation.name} -{' '}
                  {new Date(event.created_at).toLocaleTimeString('en-US', {
                    timeStyle: 'short',
                  })}
                </Card>
              );
            }

            return null;
          })}
        </li>
      ))}
    </ul>
  );
};

export default Timeline;
