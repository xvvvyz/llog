'use client';

import Button from '(components)/button';
import Input from '(components)/input';
import Label, { LabelSpan } from '(components)/label';
import supabase from '(utilities)/browser-supabase-client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';

const ChangePasswordForm = () => {
  const [isTransitioning, startTransition] = useTransition();
  const router = useRouter();
  const form = useForm({ defaultValues: { password: '' } });

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit(async ({ password }) => {
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          alert(error.message);
        } else {
          startTransition(() => router.push('/subjects'));
        }
      })}
    >
      <Label>
        <LabelSpan>New password</LabelSpan>
        <Input type="password" {...form.register('password')} />
      </Label>
      <Button
        className="mt-4 w-full"
        loading={form.formState.isSubmitting || isTransitioning}
        loadingText="Changing password…"
        type="submit"
      >
        Change password
      </Button>
    </form>
  );
};

export default ChangePasswordForm;