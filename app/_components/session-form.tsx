'use client';

import Button from '@/_components/button';
import DateTime from '@/_components/date-time';
import Input from '@/_components/input';
import ModuleFormSection from '@/_components/module-form-section';
import PageModalHeader from '@/_components/page-modal-header';
import SessionLayout from '@/_components/session-layout';
import SessionMenu from '@/_components/session-menu';
import Tip from '@/_components/tip';
import UnsavedChangesBanner from '@/_components/unsaved-changes-banner';
import useCachedForm from '@/_hooks/use-cached-form';
import upsertSession from '@/_mutations/upsert-session';
import { GetSessionData } from '@/_queries/get-session';
import { GetTrainingPlanWithSessionsData } from '@/_queries/get-training-plan-with-sessions';
import { ListInputsBySubjectIdData } from '@/_queries/list-inputs-by-subject-id';
import { ListSubjectsByTeamIdData } from '@/_queries/list-subjects-by-team-id';
import { ListTemplatesWithDataData } from '@/_queries/list-templates-with-data';
import { Database } from '@/_types/database';
import forceArray from '@/_utilities/force-array';
import formatDatetimeLocal from '@/_utilities/format-datetime-local';
import getFormCacheKey from '@/_utilities/get-form-cache-key';
import parseSessions from '@/_utilities/parse-sessions';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import { useToggle } from '@uidotdev/usehooks';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useFieldArray } from 'react-hook-form';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';

interface SessionFormProps {
  availableInputs: NonNullable<ListInputsBySubjectIdData>;
  availableTemplates: NonNullable<ListTemplatesWithDataData>;
  isDuplicate?: boolean;
  mission: NonNullable<GetTrainingPlanWithSessionsData>;
  order?: string;
  session?: NonNullable<GetSessionData>;
  subjects: NonNullable<ListSubjectsByTeamIdData>;
  subjectId: string;
}

type SessionFormValues = {
  draft: boolean;
  modules: Array<{
    content: string;
    id?: string;
    inputs: Array<Database['public']['Tables']['inputs']['Row']>;
    name?: string | null;
  }>;
  scheduledFor: string | null;
  title?: string | null;
};

const SessionForm = ({
  availableInputs,
  availableTemplates,
  isDuplicate,
  mission,
  order,
  session,
  subjects,
  subjectId,
}: SessionFormProps) => {
  const [isTransitioning, startTransition] = useTransition();
  const [ogScheduledFor, setOgScheduledFor] = useState<string | null>(null);
  const [scheduleModal, toggleScheduleModal] = useToggle(false);
  const modules = forceArray(session?.modules);
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor));

  const currentOrder = Number(
    (isDuplicate ? order : (session?.order ?? order)) ?? 0,
  );

  const cacheKey = getFormCacheKey.session({
    id: session?.id,
    isDuplicate,
    missionId: mission.id,
    subjectId,
  });

  const form = useCachedForm<SessionFormValues>(
    cacheKey,
    {
      defaultValues: {
        draft: isDuplicate ? true : (session?.draft ?? true),
        modules: modules.length
          ? modules.map((module) => ({
              content: module.content ?? '',
              id: isDuplicate ? undefined : module.id,
              inputs: availableInputs.filter((input) =>
                module.inputs.some(({ input_id }) => input_id === input.id),
              ),
              name: module.name,
            }))
          : [{ content: '', inputs: [] }],
        scheduledFor:
          !session?.scheduled_for ||
          (session.scheduled_for &&
            new Date(session.scheduled_for) < new Date())
            ? null
            : formatDatetimeLocal(session.scheduled_for, { seconds: false }),
        title: session?.title,
      },
    },
    { ignoreValues: ['draft', 'order'] },
  );

  const modulesArray = useFieldArray({
    control: form.control,
    keyName: 'key',
    name: 'modules',
  });

  const draft = form.watch('draft');
  const hasEvents = modules.some((module) => module.event?.length);
  const scheduledFor = form.watch('scheduledFor');

  const cancelScheduleModal = () => {
    form.setValue('scheduledFor', ogScheduledFor ?? null, {
      shouldDirty: true,
    });

    setOgScheduledFor(null);
    toggleScheduleModal(false);
  };

  const openScheduleModal = () => {
    setOgScheduledFor(scheduledFor);
    toggleScheduleModal(true);
  };

  const {
    highestOrder,
    highestPublishedOrder,
    nextSessionId,
    previousSessionId,
  } = parseSessions({
    currentSession: session,
    sessionOrder: currentOrder,
    sessions: mission.sessions,
  });

  return (
    <>
      <PageModalHeader
        menu={
          session &&
          !isDuplicate && (
            <SessionMenu<SessionFormValues>
              form={form}
              highestPublishedOrder={highestPublishedOrder}
              isDraft={draft}
              missionId={mission.id}
              nextSessionOrder={highestOrder + 1}
              session={session}
              subjectId={subjectId}
            />
          )
        }
        title={mission.name}
      />
      <SessionLayout
        highestOrder={highestOrder}
        isCreate={!session}
        isEdit={!!session}
        missionId={mission.id}
        nextSessionId={nextSessionId}
        order={order}
        previousSessionId={previousSessionId}
        sessionId={session?.id}
        sessions={mission.sessions}
        subjectId={subjectId}
      >
        <form
          className="flex flex-col gap-8 px-4 pb-8 pt-16 sm:px-8"
          onSubmit={form.handleSubmit((values) =>
            startTransition(async () => {
              values.scheduledFor = values.scheduledFor
                ? new Date(values.scheduledFor).toISOString()
                : null;

              const res = await upsertSession(
                {
                  currentOrder,
                  missionId: mission.id,
                  publishedOrder: Math.min(
                    currentOrder,
                    highestPublishedOrder + 1,
                  ),
                  sessionId: isDuplicate ? undefined : session?.id,
                  subjectId,
                },
                values,
              );

              if (res?.error) {
                form.setError('root', { message: res.error, type: 'custom' });
                return;
              }

              router.back();
            }),
          )}
        >
          <div className="flex items-center gap-6">
            <Input
              placeholder="Session title"
              maxLength={49}
              {...form.register('title')}
            />
            <Button
              className="shrink-0"
              disabled={hasEvents}
              onClick={openScheduleModal}
              variant="link"
            >
              <ClockIcon className="w-5" />
              {scheduledFor ? (
                <DateTime date={scheduledFor} formatter="date-time" />
              ) : (
                'Schedule'
              )}
            </Button>
          </div>
          <ul className="space-y-4">
            <DndContext
              collisionDetection={closestCenter}
              id="modules"
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;

                if (over && active.id !== over.id) {
                  modulesArray.move(
                    modulesArray.fields.findIndex((f) => f.key === active.id),
                    modulesArray.fields.findIndex((f) => f.key === over.id),
                  );
                }
              }}
              sensors={sensors}
            >
              <SortableContext
                items={modulesArray.fields.map((eventType) => eventType.key)}
                strategy={verticalListSortingStrategy}
              >
                {modulesArray.fields.map((module, eventTypeIndex) => (
                  <ModuleFormSection<SessionFormValues, 'modules'>
                    availableInputs={availableInputs}
                    availableTemplates={availableTemplates}
                    eventTypeArray={modulesArray}
                    eventTypeIndex={eventTypeIndex}
                    eventTypeKey={module.key}
                    form={form}
                    hasOnlyOne={modulesArray.fields.length === 1}
                    key={module.key}
                    subjectId={subjectId}
                    subjects={subjects}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </ul>
          <div className="flex items-center gap-4">
            <Tip side="right">
              Modules break up your session and allow you to capture inputs at
              different points. You can add as many modules as you need.
            </Tip>
            <Button
              className="w-full"
              colorScheme="transparent"
              onClick={() => modulesArray.append({ content: '', inputs: [] })}
            >
              <PlusIcon className="w-5" />
              Add module
            </Button>
          </div>
          {form.formState.errors.root && (
            <div className="text-center">
              {form.formState.errors.root.message}
            </div>
          )}
          <div className="flex flex-row gap-4 pt-8">
            {draft && (
              <Button
                className="w-full"
                colorScheme="transparent"
                loading={isTransitioning}
                loadingText="Saving…"
                type="submit"
              >
                Save as draft
              </Button>
            )}
            <Button
              className="w-full"
              loading={!draft && isTransitioning}
              loadingText="Saving…"
              onClick={() => form.setValue('draft', false)}
              type="submit"
            >
              {draft ? <>Save &amp; publish</> : <>Save</>}
            </Button>
          </div>
          <UnsavedChangesBanner<SessionFormValues> form={form} />
        </form>
      </SessionLayout>
      <Dialog onClose={cancelScheduleModal} open={scheduleModal}>
        <div className="fixed inset-0 z-20 bg-alpha-reverse-1 backdrop-blur-sm" />
        <div className="fixed inset-0 z-30 overflow-y-auto p-4">
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel className="w-full max-w-sm rounded border border-alpha-1 bg-bg-2 p-8 text-center drop-shadow-2xl">
              <DialogTitle className="text-2xl">Schedule session</DialogTitle>
              <Description className="mt-4 px-4 text-fg-4">
                Scheduled sessions are not visible to clients until the
                specified time.
              </Description>
              <div className="mt-16 flex flex-col gap-4">
                <Input
                  min={formatDatetimeLocal(new Date(), { seconds: false })}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    toggleScheduleModal(false);
                  }}
                  step={60}
                  type="datetime-local"
                  {...form.register('scheduledFor')}
                />
                <div className="flex gap-4">
                  <Button
                    className="w-full"
                    colorScheme="transparent"
                    disabled={!scheduledFor}
                    onClick={() => {
                      form.setValue('scheduledFor', null, {
                        shouldDirty: true,
                      });

                      toggleScheduleModal(false);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    className="w-full"
                    disabled={!scheduledFor}
                    onClick={() => toggleScheduleModal(false)}
                  >
                    Schedule
                  </Button>
                </div>
                <Button
                  className="m-0 -mb-3 w-full justify-center p-0 py-3"
                  onClick={cancelScheduleModal}
                  variant="link"
                >
                  Close
                </Button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export type { SessionFormValues };
export default SessionForm;
