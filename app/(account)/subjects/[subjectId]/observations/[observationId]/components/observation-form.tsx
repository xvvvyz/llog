'use client';

import Button from 'components/button';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import supabase from '../../../../../../utilities/browser-supabase-client';
import sleep from '../../../../../../utilities/sleep';

interface ObservationFormProps {
  observationId: string;
  subjectId: string;
}

const ObservationForm = ({
  observationId,
  subjectId,
}: ObservationFormProps) => {
  const router = useRouter();
  const form = useForm();

  return (
    <form
      onSubmit={form.handleSubmit(async () => {
        const { error: eventError } = await supabase.rpc(
          'upsert_observation_event',
          {
            event: { observation_id: observationId, subject_id: subjectId },
            event_input_option_ids: [],
          }
        );

        if (eventError) {
          alert(eventError.message);
          return;
        }

        await router.push(`/subjects/${subjectId}`);
        await router.refresh();
        await sleep();
      })}
    >
      <Button
        className="w-full"
        loading={form.formState.isSubmitting}
        loadingText="Saving…"
        type="submit"
      >
        Save
      </Button>
    </form>
  );
};

export default ObservationForm;
