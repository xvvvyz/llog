import BackButton from '@/_components/back-button';
import DateTime from '@/_components/date-time';
import Empty from '@/_components/empty';
import ModuleCard from '@/_components/module-card';
import PageModalHeader from '@/_components/page-modal-header';
import SessionLayout from '@/_components/session-layout';
import SessionMenu from '@/_components/session-menu';
import ViewAllSessionsButton from '@/_components/view-all-sessions-button';
import getCurrentUser from '@/_queries/get-current-user';
import getPublicSessionWithDetails from '@/_queries/get-public-session-with-details';
import getPublicSubject from '@/_queries/get-public-subject';
import getPublicTrainingPlanWithSessions from '@/_queries/get-public-training-plan-with-sessions';
import getSessionWithDetails from '@/_queries/get-session-with-details';
import getSubject from '@/_queries/get-subject';
import getTrainingPlanWithSessions from '@/_queries/get-training-plan-with-sessions';
import firstIfArray from '@/_utilities/first-if-array';
import parseSessions from '@/_utilities/parse-sessions';
import CalendarDaysIcon from '@heroicons/react/24/outline/CalendarDaysIcon';

interface SessionPageProps {
  isPublic?: boolean;
  missionId: string;
  sessionId: string;
  subjectId: string;
}

const SessionPage = async ({
  isPublic,
  missionId,
  sessionId,
  subjectId,
}: SessionPageProps) => {
  const [{ data: subject }, { data: trainingPlan }, { data: session }, user] =
    await Promise.all([
      isPublic ? getPublicSubject(subjectId) : getSubject(subjectId),
      isPublic
        ? getPublicTrainingPlanWithSessions(missionId)
        : getTrainingPlanWithSessions(missionId),
      isPublic
        ? getPublicSessionWithDetails(sessionId)
        : getSessionWithDetails(sessionId),
      getCurrentUser(),
    ]);

  if (!subject || !trainingPlan || !session) return null;
  const isTeamMember = !!user && subject.team_id === user.id;

  const {
    highestOrder,
    highestPublishedOrder,
    nextSessionId,
    previousSessionId,
  } = parseSessions({
    currentSession: session,
    sessionOrder: session.order,
    sessions: trainingPlan.sessions,
  });

  return (
    <>
      <PageModalHeader
        menu={
          isTeamMember && (
            <SessionMenu
              highestPublishedOrder={highestPublishedOrder}
              isView
              missionId={missionId}
              nextSessionOrder={highestOrder + 1}
              session={session}
              subjectId={subjectId}
            />
          )
        }
        subtitle={
          <ViewAllSessionsButton
            isPublic={isPublic}
            missionId={missionId}
            subjectId={subjectId}
          />
        }
        title={trainingPlan.name}
      />
      <SessionLayout
        highestOrder={highestOrder}
        isPublic={isPublic}
        missionId={missionId}
        nextSessionId={nextSessionId}
        previousSessionId={previousSessionId}
        sessionId={sessionId}
        sessions={trainingPlan.sessions}
        subjectId={subjectId}
      >
        {session.scheduled_for &&
        new Date(session.scheduled_for) > new Date() ? (
          <Empty className="mt-6 border-0">
            <CalendarDaysIcon className="w-7" />
            <p>
              Scheduled for{' '}
              <DateTime
                className="inline"
                date={session.scheduled_for}
                formatter="date-time"
              />
            </p>
          </Empty>
        ) : (
          <>
            {session.title && (
              <p className="mx-auto max-w-xs px-4 text-center">
                {session.title}
              </p>
            )}
            <ul className="mt-8 space-y-4 border-y border-alpha-1 bg-alpha-reverse-2 py-4">
              {session.modules.map((module, i) => {
                const event = firstIfArray(module.event);
                const previousModule = session.modules[i - 1];

                return (
                  <li
                    className="border-y border-alpha-1 bg-bg-2"
                    key={module.id}
                  >
                    <ModuleCard
                      disabled={
                        !!previousModule?.event && !previousModule.event.length
                      }
                      event={event}
                      eventType={module}
                      isArchived={subject.archived}
                      isPublic={isPublic}
                      isTeamMember={isTeamMember}
                      mission={trainingPlan}
                      subjectId={subjectId}
                      user={user}
                    />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </SessionLayout>
      <BackButton className="m-0 block w-full py-6 text-center" variant="link">
        Close
      </BackButton>
    </>
  );
};

export default SessionPage;
