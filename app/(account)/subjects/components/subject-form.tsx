'use client';

import Avatar from 'components/avatar';
import Button from 'components/button';
import Input from 'components/input';
import Label from 'components/label';
import Select from 'components/select';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Controller, useForm } from 'react-hook-form';
import { Database } from 'types/database';
import supabase from 'utilities/browser-supabase-client';
import forceArray from 'utilities/force-array';
import globalValueCache from 'utilities/global-value-cache';
import sleep from 'utilities/sleep';

type Observation = Pick<
  Database['public']['Tables']['observations']['Row'],
  'id' | 'name'
>;

type Subject = Pick<
  Database['public']['Tables']['subjects']['Row'],
  'id' | 'image_uri' | 'name'
> & {
  observations: Observation | Observation[] | null;
};

interface SubjectFormProps {
  availableObservations: Observation[] | null;
  subject?: Subject;
}

interface SubjectFormValues {
  name: string;
  observations: Observation[];
}

const SubjectForm = ({ availableObservations, subject }: SubjectFormProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<SubjectFormValues>({
    defaultValues:
      searchParams.has('useCache') &&
      globalValueCache.has('subject_form_values')
        ? globalValueCache.get('subject_form_values')
        : {
            name: subject?.name ?? '',
            observations: forceArray(subject?.observations),
          },
  });

  const dropzone = useDropzone({
    accept: { 'image/*': ['.png', '.gif', '.jpeg', '.jpg'] },
    maxSize: 10000000,
    multiple: false,
    noClick: true,
  });

  const coverImage = dropzone.acceptedFiles[0] ?? subject?.image_uri;

  return (
    <form
      onSubmit={form.handleSubmit(async ({ name, observations }) => {
        const { data: subjectData, error: subjectError } = await supabase.rpc(
          'upsert_subject_with_observations',
          {
            observation_ids: observations.map(({ id }) => id),
            subject: { id: subject?.id, name },
          }
        );

        if (subjectError) {
          alert(subjectError.message);
          return;
        }

        if (dropzone.acceptedFiles.length) {
          const ext = dropzone.acceptedFiles[0].name.split('.').pop();

          await supabase.storage
            .from('subjects')
            .upload(
              `${(subjectData as unknown as { id: string }).id}/image.${ext}`,
              dropzone.acceptedFiles[0],
              { upsert: true }
            );
        }

        await router.push(searchParams.get('back') ?? '/subjects');
        await router.refresh();
        await sleep();
      })}
    >
      <Label>
        Subject name
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => <Input {...field} />}
        />
      </Label>
      <Label className="mt-6">
        <div className="flex justify-between">
          Enabled observation types
          <Button
            className="underline"
            href={`/observations/add?back=${pathname}?useCache=true`}
            onClick={() =>
              globalValueCache.set('subject_form_values', form.getValues())
            }
            variant="link"
          >
            Add type
          </Button>
        </div>
        <Controller
          control={form.control}
          name="observations"
          render={({ field }) => (
            <Select isMulti options={availableObservations ?? []} {...field} />
          )}
        />
      </Label>
      <Label className="mt-6">
        Profile image
        <div
          className="flex cursor-pointer items-center justify-center gap-6 rounded border-2 border-dashed border-alpha-2 px-4 py-9 ring-accent-2 hover:border-alpha-3 focus:outline-none focus:ring-1"
          {...dropzone.getRootProps()}
        >
          <Avatar file={coverImage} name={form.watch('name')} />
          <p>
            Drag image here or <span className="text-fg-1">browse</span>
          </p>
          <input {...dropzone.getInputProps()} />
        </div>
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

export default SubjectForm;
