'use client';

import Button from 'components/button';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import supabase from 'utilities/browser-supabase-client';
import sleep from 'utilities/sleep';

interface RoutineFormProps {
  eventId?: string;
  routineId: string;
  subjectId: string;
}

const RoutineForm = ({ eventId, routineId, subjectId }: RoutineFormProps) => {
  const router = useRouter();
  const form = useForm({});

  return (
    <form
      onSubmit={form.handleSubmit(async () => {
        const { error: eventError } = await supabase.rpc(
          'upsert_routine_event',
          {
            event: {
              id: eventId,
              routine_id: routineId,
              subject_id: subjectId,
            },
            event_input_option_ids: [],
          }
        );

        if (eventError) {
          alert(eventError.message);
          return;
        }

        await router.refresh();
        await sleep(1000);
      })}
    >
      <Button
        className="mt-12 w-full"
        colorScheme={eventId ? 'transparent' : 'accent'}
        loading={form.formState.isSubmitting}
        loadingText="Saving…"
        type="submit"
      >
        {eventId ? 'Save' : 'Complete'}
      </Button>
    </form>
  );
};

export default RoutineForm;
