'use client';

import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Controller, useForm } from 'react-hook-form';
import Avatar from '/components/avatar';
import Button from '/components/button';
import Input from '/components/input';
import Label from '/components/label';
import { Database } from '/supabase/types';
import supabase from '/utilities/browser-supabase-client';
import sleep from '/utilities/sleep';

interface SubjectFormValues {
  name: string;
}

const SubjectForm = (
  subject: Database['public']['Tables']['subjects']['Update']
) => {
  const router = useRouter();

  const form = useForm<SubjectFormValues>({
    defaultValues: { name: subject?.name ?? '' },
  });

  const dropzone = useDropzone({
    accept: { 'image/*': ['.png', '.gif', '.jpeg', '.jpg'] },
    maxSize: 10000000,
    multiple: false,
    noClick: true,
  });

  const coverImage = dropzone.acceptedFiles[0] ?? subject.image_uri;

  return (
    <form
      onSubmit={form.handleSubmit(async ({ name }) => {
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .upsert({ id: subject?.id, name })
          .select('id')
          .single();

        if (subjectError) {
          alert(subjectError?.message);
          return;
        }

        if (dropzone.acceptedFiles.length) {
          const ext = dropzone.acceptedFiles[0].name.split('.').pop();

          await supabase.storage
            .from('subjects')
            .upload(
              `${subjectData.id}/image.${ext}`,
              dropzone.acceptedFiles[0],
              { upsert: true }
            );
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
      <Label className="mt-6">
        Image
        <div
          className="flex cursor-pointer flex-row items-center justify-center gap-6 rounded border-2 border-dashed border-alpha-3 px-4 py-9 ring-accent-2 focus:outline-none focus:ring-1"
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
