import Card from 'components/card';
import Empty from 'components/empty';
import firstIfArray from 'utilities/first-if-array';
import listEvents from 'utilities/list-events';

interface TimelineProps {
  subjectId: string;
}

const Timeline = async ({ subjectId }: TimelineProps) => {
  const { data: events } = await listEvents(subjectId);
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
            const routine = firstIfArray(event.routine);

            const time = new Date(event.created_at).toLocaleTimeString(
              'en-US',
              { timeStyle: 'short' }
            );

            if (observation) {
              return (
                <Card key={event.id} size="sm">
                  Observation - {observation.name} - {time}
                </Card>
              );
            }

            if (routine) {
              return (
                <Card key={event.id} size="sm">
                  Routine - {routine.name} - {time}
                </Card>
              );
            }
          })}
        </li>
      ))}
    </ul>
  );
};

export default Timeline;
