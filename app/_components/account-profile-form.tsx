'use client';

import AvatarDropzone from '@/_components/avatar-dropzone';
import BackButton from '@/_components/back-button';
import Button from '@/_components/button';
import Input from '@/_components/input';
import updateUser from '@/_mutations/update-user';
import createBrowserSupabaseClient from '@/_utilities/create-browser-supabase-client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';

interface AccountProfileFormProps {
  user: User;
}

interface AccountProfileFormValues {
  avatar: File | string | null;
  firstName: string;
  lastName: string;
}

const AccountProfileForm = ({ user }: AccountProfileFormProps) => {
  const [isTransitioning, startTransition] = useTransition();

  const form = useForm<AccountProfileFormValues>({
    defaultValues: {
      avatar: user.user_metadata.image_uri,
      firstName: user.user_metadata.first_name,
      lastName: user.user_metadata.last_name,
    },
  });

  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-8 px-4 pb-8 pt-6 sm:px-8"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const supabase = createBrowserSupabaseClient();

          if (!values.avatar) {
            await Promise.all([
              supabase.storage.from('profiles').remove([`${user.id}/avatar`]),
              supabase.auth.updateUser({ data: { image_uri: null } }),
            ]);
          }

          if (values.avatar instanceof File) {
            await supabase.storage
              .from('profiles')
              .upload(`${user.id}/avatar`, values.avatar, { upsert: true });
          }

          const res = await updateUser({
            first_name: values.firstName,
            last_name: values.lastName,
          });

          if (res?.error) {
            form.setError('root', { message: res.error, type: 'custom' });
            return;
          }

          router.back();
        }),
      )}
    >
      <div className="flex gap-6">
        <Input label="First name" required {...form.register('firstName')} />
        <Input label="Last name" required {...form.register('lastName')} />
      </div>
      <div className="relative">
        <label className="group">
          <span className="label">Profile image</span>
          <AvatarDropzone
            file={form.watch('avatar')}
            id={user.id}
            onDrop={(files) => form.setValue('avatar', files[0])}
          />
        </label>
        {form.watch('avatar') && (
          <Button
            className="absolute right-4 top-0"
            onClick={() => form.setValue('avatar', null)}
            variant="link"
          >
            Remove image
          </Button>
        )}
      </div>
      {form.formState.errors.root && (
        <div className="text-center">{form.formState.errors.root.message}</div>
      )}
      <div className="flex gap-4 pt-8">
        <BackButton className="w-full" colorScheme="transparent">
          Close
        </BackButton>
        <Button
          className="w-full"
          loading={isTransitioning}
          loadingText="Saving…"
          type="submit"
        >
          Save
        </Button>
      </div>
    </form>
  );
};

export default AccountProfileForm;
