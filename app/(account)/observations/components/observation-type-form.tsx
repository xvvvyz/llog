'use client';

import Button from 'components/button';
import Input from 'components/input';
import Label from 'components/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { Database } from 'types/database';
import supabase from 'utilities/browser-supabase-client';
import sleep from 'utilities/sleep';
import Textarea from '../../../components/textarea';

interface ObservationTypeFormProps {
  observation?: Pick<
    Database['public']['Tables']['observations']['Row'],
    'description' | 'id' | 'name'
  >;
}

interface ObservationTypeFormValues {
  description: string;
  name: string;
}

const ObservationTypeForm = ({ observation }: ObservationTypeFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<ObservationTypeFormValues>({
    defaultValues: {
      description: observation?.description ?? '',
      name: observation?.name ?? '',
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit(async ({ description, name }) => {
        const { error: observationError } = await supabase
          .from('observations')
          .upsert({ description, id: observation?.id, name });

        if (observationError) {
          alert(observationError?.message);
          return;
        }

        await router.push(searchParams.get('back') ?? '/observations');
        await router.refresh();
        await sleep();
      })}
    >
      <Label>
        Observation name
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => <Input {...field} />}
        />
      </Label>
      <Label className="mt-6">
        Description
        <Controller
          control={form.control}
          name="description"
          render={({ field }) => <Textarea {...field} />}
        />
      </Label>
      <Button
        className="mt-12 w-full"
        loading={form.formState.isSubmitting}
        loadingText="Saving…"
        type="submit"
      >
        Save
      </Button>
    </form>
  );
};

export default ObservationTypeForm;
