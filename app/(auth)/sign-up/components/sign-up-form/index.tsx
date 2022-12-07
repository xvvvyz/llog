'use client';

import { ArrowRightIcon } from '@heroicons/react/24/solid';
import { Form, Formik } from 'formik';
import { useRouter } from 'next/navigation';
import Button from '/components/button';
import Input from '/components/input';
import Label from '/components/label';
import supabase from '/utilities/browser-supabase-client';
import sleep from '/utilities/sleep';

const SignUpForm = () => {
  const router = useRouter();

  return (
    <Formik
      initialValues={{ email: '', firstName: '', lastName: '', password: '' }}
      onSubmit={async ({ email, firstName, lastName, password }) => {
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
      }}
    >
      {({ isSubmitting }) => (
        <Form>
          <div className="mt-9 flex gap-6">
            <Label>
              First name
              <Input name="firstName" placeholder="Jane" />
            </Label>
            <Label>
              Last name
              <Input name="lastName" placeholder="Doe" />
            </Label>
          </div>
          <Label className="mt-6">
            Email address
            <Input name="email" placeholder="jane@example.com" type="email" />
          </Label>
          <Label className="mt-6">
            Password
            <Input name="password" type="password" />
          </Label>
          <Button className="mt-12" loading={isSubmitting} loadingText="Creating account…" type="submit">
            Create account
            <ArrowRightIcon className="w-5" />
          </Button>
        </Form>
      )}
    </Formik>
  );
};

export default SignUpForm;
