import { PlusIcon } from '@heroicons/react/24/solid';
import Button from 'components/button';
import Input from 'components/input';
import RichTextarea from 'components/rich-textarea';
import { Controller, useFieldArray, UseFormReturn } from 'react-hook-form';
import { DEFAULT_ROUTINE_VALUES, MissionFormValues } from './mission-form';

interface SessionFormSectionProps {
  form: UseFormReturn<MissionFormValues>;
  index: number;
}

const SessionFormSection = ({
  form,
  index: sessionIndex,
}: SessionFormSectionProps) => {
  const routinesArray = useFieldArray({
    control: form.control,
    name: `routines.${sessionIndex}`,
  });

  return (
    <>
      <h2 className="mt-6 text-fg-2">Session {sessionIndex + 1}</h2>
      <ul className="flex flex-col gap-3 pt-2">
        {routinesArray.fields.map((item, index) => (
          <li key={item.id}>
            <Controller
              control={form.control}
              name={`routines.${sessionIndex}.${index}.name`}
              render={({ field }) => (
                <Input
                  aria-label="Routine name"
                  className="rounded-b-none"
                  placeholder="Routine name…"
                  {...field}
                />
              )}
            />
            <Controller
              control={form.control}
              name={`routines.${sessionIndex}.${index}.content`}
              render={({ field }) => (
                <RichTextarea
                  className="rounded-t-none border-t-0"
                  {...field}
                />
              )}
            />
          </li>
        ))}
      </ul>
      <Button
        className="mt-3 w-full"
        colorScheme="transparent"
        onClick={() => routinesArray.append(DEFAULT_ROUTINE_VALUES)}
        size="sm"
        type="button"
      >
        <PlusIcon className="w-5" />
        Add routine
      </Button>
    </>
  );
};

export default SessionFormSection;
