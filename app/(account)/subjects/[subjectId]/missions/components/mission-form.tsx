'use client';

import Button from 'components/button';
import Input from 'components/input';
import Label from 'components/label';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { Database } from 'types/database';
import supabase from 'utilities/browser-supabase-client';
import sleep from 'utilities/sleep';

interface MissionFormProps {
  mission?: Database['public']['Tables']['missions']['Update'];
  subjectId: string;
}

interface MissionFormValues {
  name: string;
}

const MissionForm = ({ mission, subjectId }: MissionFormProps) => {
  const router = useRouter();

  const form = useForm<MissionFormValues>({
    defaultValues: { name: mission?.name ?? '' },
  });

  return (
    <form
      onSubmit={form.handleSubmit(async ({ name }) => {
        const { error: missionError } = await supabase
          .from('missions')
          .upsert({ id: mission?.id, name, subject_id: subjectId })
          .select('id')
          .single();

        if (missionError) {
          alert(missionError?.message);
          return;
        }

        await router.back();
        await router.refresh();
        await sleep();
      })}
    >
      <Label>
        Name
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => <Input {...field} />}
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

export default MissionForm;
