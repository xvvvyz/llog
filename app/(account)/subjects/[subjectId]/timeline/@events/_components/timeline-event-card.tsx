'use client';

import EventCommentForm from '@/(account)/subjects/[subjectId]/_components/event-comment-form';
import EventComments from '@/(account)/subjects/[subjectId]/_components/event-comments';
import EventInputs from '@/(account)/subjects/[subjectId]/_components/event-inputs';
import Avatar from '@/_components/avatar';
import Button from '@/_components/button';
import DateTime from '@/_components/date-time';
import Pill from '@/_components/pill';
import { ListEventsData } from '@/_server/list-events';
import firstIfArray from '@/_utilities/first-if-array';
import forceArray from '@/_utilities/force-array';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';

interface TimelineEventCardProps {
  group: ListEventsData;
  subjectId: string;
  userId: string;
}

const TimelineEventCard = ({
  group,
  subjectId,
  userId,
}: TimelineEventCardProps) => {
  const lastEvent = group[group.length - 1];
  const lastEventType = firstIfArray(lastEvent.type);
  const sessionNumber = lastEventType.session?.order + 1;

  const link = lastEventType.session
    ? `/subjects/${subjectId}/mission/${lastEventType.session.mission.id}/session/${lastEventType.session.id}`
    : `/subjects/${subjectId}/event/${lastEvent.id}`;

  return (
    <article
      className="group cursor-pointer select-none overflow-hidden rounded border border-alpha-1 bg-bg-2 transition-colors hover:border-alpha-4"
      onClick={() => window.open(link, '_blank')}
      role="link"
    >
      <Button
        className="m-0 block w-full p-0"
        href={link}
        onClick={(e) => e.stopPropagation()}
        target="_blank"
        variant="link"
      >
        <header className="flex w-full items-center gap-4 rounded-t bg-alpha-reverse-1 px-4 py-3">
          <div className="flex w-0 flex-1">
            <span className="truncate">
              {lastEventType.session
                ? lastEventType.session.mission.name
                : lastEventType.name}
            </span>
          </div>
          {lastEventType.session ? (
            <Pill>Session {sessionNumber}</Pill>
          ) : (
            <div className="flex items-center gap-4 whitespace-nowrap">
              <Avatar
                name={firstIfArray(lastEvent.profile).first_name}
                size="xs"
              />
              <DateTime
                className="text-xs uppercase tracking-widest text-fg-3"
                date={lastEvent.created_at}
                formatter="time"
              />
            </div>
          )}
          <ArrowUpRightIcon className="w-5" />
        </header>
      </Button>
      <ul>
        {group.map((event) => {
          const routineNumber = firstIfArray(event.type).order + 1;
          const comments = forceArray(event.comments);

          return (
            <li key={event.id}>
              {lastEventType.session && (
                <div className="flex items-center justify-between border-t border-alpha-1 bg-alpha-reverse-1 px-4 pb-2 pt-3 text-xs uppercase tracking-widest text-fg-3">
                  <span>Routine {routineNumber}</span>
                  <div className="flex items-center gap-4">
                    <Avatar
                      name={firstIfArray(event.profile).first_name}
                      size="xs"
                    />
                    <DateTime date={event.created_at} formatter="time" />
                  </div>
                </div>
              )}
              <EventInputs inputs={forceArray(event.inputs)} />
              {!!comments.length && (
                <div className="space-y-4 border-t border-alpha-1 p-4">
                  <EventComments comments={comments} userId={userId} />
                  <EventCommentForm
                    eventId={event.id}
                    inputClassName="rounded-sm"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
};

export default TimelineEventCard;