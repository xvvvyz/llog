'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '/components/button';
import Input from '/components/input';
import Label from '/components/label';
import supabase from '/utilities/browser-supabase-client';
import globalStringCache from '/utilities/global-string-cache';

const ForgotPasswordForm = () => {
  const [linkSent, setLinkSent] = useState(false);

  const form = useForm({
    defaultValues: { email: globalStringCache.get('email') },
  });

  return (
    <form
      onSubmit={form.handleSubmit(async ({ email }) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/change-password`,
        });

        if (error) alert(error.message);
        else setLinkSent(true);
      })}
    >
      <Label className="mt-9">
        Email address
        <Input disabled={linkSent} type="email" {...form.register('email')} />
      </Label>
      <Button
        className="mt-12 w-full"
        disabled={linkSent}
        loading={form.formState.isSubmitting}
        loadingText="Sending link…"
        type="submit"
      >
        {linkSent ? <>Link sent&mdash;check your email</> : <>Send link</>}
      </Button>
    </form>
  );
};

export default ForgotPasswordForm;