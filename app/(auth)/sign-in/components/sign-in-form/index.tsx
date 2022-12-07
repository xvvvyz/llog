'use client';

import { ArrowRightIcon } from '@heroicons/react/24/solid';
import { Form, Formik } from 'formik';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '/components/button';
import Input from '/components/input';
import Label from '/components/label';
import supabase from '/utilities/browser-supabase-client';
import globalStringCache from '/utilities/global-string-cache';
import sleep from '/utilities/sleep';

const SignInForm = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  return (
    <Formik
      initialValues={{ email: globalStringCache.get('email'), password: '' }}
      onSubmit={async ({ email, password }) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          alert(error.message);
        } else {
          await router.push(decodeURI(searchParams.get('redirect') ?? '/subjects'));
          await sleep();
        }
      }}
    >
      {({ isSubmitting, values }) => (
        <Form>
          <Label className="mt-9">
            Email address
            <Input name="email" placeholder="jane@example.com" type="email" />
          </Label>
          <Label className="mt-6">
            <div className="flex justify-between">
              <span>Password</span>
              <Link href="/forgot-password" onClick={() => globalStringCache.set('email', values.email)}>
                Forgot your password?
              </Link>
            </div>
            <Input name="password" type="password" />
          </Label>
          <Button className="mt-12" loading={isSubmitting} loadingText="Signing in…" type="submit">
            Sign in
            <ArrowRightIcon className="w-5" />
          </Button>
        </Form>
      )}
    </Formik>
  );
};

export default SignInForm;
