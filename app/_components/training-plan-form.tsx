'use client';

import BackButton from '@/_components/back-button';
import Button from '@/_components/button';
import Input from '@/_components/input';
import upsertTrainingPlan from '@/_mutations/upsert-training-plan';
import { GetTrainingPlanData } from '@/_queries/get-training-plan';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';

interface TrainingPlanFormProps {
  mission?: NonNullable<GetTrainingPlanData>;
  subjectId: string;
}

interface TrainingPlanFormValues {
  name: string;
}

const TrainingPlanForm = ({ mission, subjectId }: TrainingPlanFormProps) => {
  const [isTransitioning, startTransition] = useTransition();

  const form = useForm<TrainingPlanFormValues>({
    defaultValues: { name: mission?.name },
  });

  const router = useRouter();

  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const res = await upsertTrainingPlan(
            { missionId: mission?.id, subjectId },
            values,
          );

          if (res?.error) {
            form.setError('root', { message: res.error, type: 'custom' });
            return;
          }

          localStorage.setItem('refresh', '1');

          if (mission) {
            router.back();
          } else if (res.data) {
            router.replace(
              `/subjects/${subjectId}/training-plans/${res.data.id}/sessions`,
            );
          }
        }),
      )}
    >
      <div className="px-4 py-8 sm:px-8">
        <Input
          label="Name"
          maxLength={49}
          required
          tooltip="Succinctly describe the goal or purpose of the training plan."
          {...form.register('name')}
        />
      </div>
      {form.formState.errors.root && (
        <div className="px-4 py-8 text-center sm:px-8">
          {form.formState.errors.root.message}
        </div>
      )}
      <div className="flex gap-4 px-4 py-8 sm:px-8">
        <BackButton className="w-full" colorScheme="transparent">
          Close
        </BackButton>
        <Button
          className="w-full"
          loading={isTransitioning}
          loadingText="Saving…"
          type="submit"
        >
          {mission ? 'Save' : 'Continue'}
        </Button>
      </div>
    </form>
  );
};

export type { TrainingPlanFormValues };
export default TrainingPlanForm;