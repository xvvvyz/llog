import LinkList from '@/_components/link-list';
import getCurrentTeamId from '@/_server/get-current-team-id';
import getSubject from '@/_server/get-subject';
import listMissions from '@/_server/list-missions';
import { Database } from '@/_types/database';
import forceArray from '@/_utilities/force-array';

interface PageProps {
  params: {
    subjectId: string;
  };
}

const Page = async ({ params: { subjectId } }: PageProps) => {
  const { data: subject } = await getSubject(subjectId);
  if (!subject) return null;
  const currentTeamId = await getCurrentTeamId();
  const isTeamMember = subject.team_id === currentTeamId;
  const { data: missions } = await listMissions(subjectId);

  return (
    <LinkList>
      {forceArray(missions).reduce((acc, mission) => {
        const sessions = forceArray(mission.sessions);

        const activeSession = sessions.find(({ routines }) =>
          routines.find(
            (et: { events: Database['public']['Tables']['events']['Row'][] }) =>
              !et.events.length
          )
        );

        if (!activeSession) return acc;

        acc.push(
          <LinkList.Item
            href={`/subjects/${subjectId}/mission/${mission.id}/session/${activeSession.id}`}
            key={mission.id}
            text={mission.name}
            {...(isTeamMember
              ? {
                  rightHref: `/subjects/${subjectId}/settings/mission/${mission.id}?back=/subjects/${subjectId}`,
                  rightIcon: 'edit',
                  rightLabel: 'Edit',
                }
              : {})}
          />
        );

        return acc;
      }, [])}
    </LinkList>
  );
};

export const revalidate = 0;
export default Page;