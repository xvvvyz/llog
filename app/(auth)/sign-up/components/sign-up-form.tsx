'use client';

import Button from 'components/button';
import Input from 'components/input';
import Label from 'components/label';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import supabase from 'utilities/browser-supabase-client';
import sleep from 'utilities/sleep';

const SignUpForm = () => {
  const router = useRouter();

  const form = useForm({
    defaultValues: { email: '', firstName: '', lastName: '', password: '' },
  });

  return (
    <form
      onSubmit={form.handleSubmit(
        async ({ email, firstName, lastName, password }) => {
          const { error } = await supabase.auth.signUp({
            email,
            options: { data: { first_name: firstName, last_name: lastName } },
            password,
          });

          if (error) {
            alert(error.message);
          } else {
            await router.push('/subjects');
            await sleep();
          }
        }
      )}
    >
      <div className="mt-9 flex gap-6">
        <Label>
          First name
          <Input {...form.register('firstName')} />
        </Label>
        <Label>
          Last name
          <Input {...form.register('lastName')} />
        </Label>
      </div>
      <Label className="mt-6">
        Email address
        <Input type="email" {...form.register('email')} />
      </Label>
      <Label className="mt-6">
        Password
        <Input type="password" {...form.register('password')} />
      </Label>
      <Button
        className="mt-12 w-full"
        loading={form.formState.isSubmitting}
        loadingText="Creating account…"
        type="submit"
      >
        Create account
      </Button>
    </form>
  );
};

export default SignUpForm;
