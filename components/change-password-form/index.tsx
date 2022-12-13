'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Button from '/components/button';
import Input from '/components/input';
import Label from '/components/label';
import supabase from '/utilities/browser-supabase-client';
import sleep from '/utilities/sleep';

const ChangePasswordForm = () => {
  const router = useRouter();
  const form = useForm({ defaultValues: { password: '' } });

  return (
    <form
      onSubmit={form.handleSubmit(async ({ password }) => {
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          alert(error.message);
        } else {
          await router.push('/subjects');
          await sleep();
        }
      })}
    >
      <Label className="mt-9">
        New password
        <Input type="password" {...form.register('password')} />
      </Label>
      <Button
        className="mt-12 w-full"
        loading={form.formState.isSubmitting}
        loadingText="Changing password…"
        type="submit"
      >
        Change password
      </Button>
    </form>
  );
};

export default ChangePasswordForm;
