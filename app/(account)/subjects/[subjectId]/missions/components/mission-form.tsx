'use client';

import { PlusIcon } from '@heroicons/react/24/solid';
import Button from 'components/button';
import Input from 'components/input';
import Label from 'components/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Database } from 'types/database';
import supabase from 'utilities/browser-supabase-client';
import forceArray from 'utilities/force-array';
import { GetMissionWithRoutinesData } from 'utilities/get-mission-with-routines';
import sanitizeHtml from 'utilities/sanitize-html';
import sleep from 'utilities/sleep';
import SessionFormSection from './session-form-section';

const DEFAULT_ROUTINE_VALUES = {
  content: '<ol><li></li><li></li><li></li></ol>',
  mission_id: '',
  name: '',
  order: 0,
  session: 0,
};

interface MissionFormProps {
  mission?: GetMissionWithRoutinesData;
  subjectId: string;
}

type Routine = Database['public']['Tables']['routines']['Insert'];

type MissionFormValues = Database['public']['Tables']['missions']['Insert'] & {
  routines: Routine[][];
};

const MissionForm = ({ mission, subjectId }: MissionFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<MissionFormValues>({
    defaultValues: {
      id: mission?.id,
      name: mission?.name ?? '',
      routines: forceArray(mission?.routines).reduce((acc, routine) => {
        if (acc[routine.session]) acc[routine.session].push(routine);
        else acc[routine.session] = [routine];
        return acc;
      }, []),
    },
  });

  const routinesArray = useFieldArray({
    control: form.control,
    name: 'routines',
  });

  return (
    <form
      onSubmit={form.handleSubmit(async ({ id, name, routines }) => {
        const { data: missionData, error: missionError } = await supabase
          .from('missions')
          .upsert({ id, name, subject_id: subjectId })
          .select('id')
          .single();

        if (missionError) {
          alert(missionError.message);
          return;
        }

        form.setValue('id', missionData.id);

        const { newRoutines, updatedRoutines } = routines.reduce(
          (acc, sessionRoutines, session) => {
            sessionRoutines.forEach((routine) => {
              const payload = {
                content: sanitizeHtml(routine.content),
                id: routine.id,
                mission_id: missionData.id,
                name: routine.name,
                order: acc.order,
                session,
              };

              if (routine.id) acc.updatedRoutines.push(payload);
              else acc.newRoutines.push(payload);
              acc.order++;
            });

            return acc;
          },
          {
            newRoutines: [] as Routine[],
            order: 0,
            updatedRoutines: [] as Routine[],
          }
        );

        if (updatedRoutines.length) {
          const { error: routinesError } = await supabase
            .from('routines')
            .upsert(updatedRoutines.sort((a, b) => b.order - a.order));

          if (routinesError) {
            alert(routinesError.message);
            return;
          }
        }

        if (newRoutines.length) {
          const { error: routinesError } = await supabase
            .from('routines')
            .upsert(newRoutines);

          if (routinesError) {
            alert(routinesError.message);
            return;
          }
        }

        await router.push(searchParams.get('back') ?? `/subjects/${subjectId}`);
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
      <ul>
        {routinesArray.fields.map((item, index) => (
          <li key={item.id}>
            <SessionFormSection form={form} index={index} />
          </li>
        ))}
      </ul>
      <Button
        className="mt-12 w-full"
        colorScheme="transparent"
        onClick={() => routinesArray.append([[DEFAULT_ROUTINE_VALUES]])}
        type="button"
      >
        <PlusIcon className="w-5" />
        Add session
      </Button>
      <div className="mt-12">
        <Button
          className="w-full"
          loading={form.formState.isSubmitting}
          loadingText="Saving…"
          type="submit"
        >
          Save
        </Button>
      </div>
    </form>
  );
};

export type { MissionFormValues };
export { DEFAULT_ROUTINE_VALUES };
export default MissionForm;
