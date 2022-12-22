'use client';

import Button from 'components/button';
import Input from 'components/input';
import Label from 'components/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import supabase from 'utilities/browser-supabase-client';
import globalStringCache from 'utilities/global-string-cache';
import sleep from 'utilities/sleep';

const SignInForm = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const form = useForm({
    defaultValues: { email: globalStringCache.get('email'), password: '' },
  });

  return (
    <form
      onSubmit={form.handleSubmit(async ({ email, password }) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          alert(error.message);
        } else {
          const redirect = searchParams.get('redirect') ?? '/subjects';
          await router.push(decodeURI(redirect));
          await sleep();
        }
      })}
    >
      <Label className="mt-9">
        Email address
        <Input type="email" {...form.register('email')} />
      </Label>
      <Label className="mt-6">
        <div className="flex justify-between">
          Password
          <Button
            className="underline"
            href="/forgot-password"
            onClick={() =>
              globalStringCache.set('email', form.getValues('email'))
            }
            variant="link"
          >
            Forgot your password?
          </Button>
        </div>
        <Input type="password" {...form.register('password')} />
      </Label>
      <Button
        className="mt-12 w-full"
        loading={form.formState.isSubmitting}
        loadingText="Signing in…"
        type="submit"
      >
        Sign in
      </Button>
    </form>
  );
};

export default SignInForm;
