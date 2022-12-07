'use client';

import { ArrowRightIcon } from '@heroicons/react/24/solid';
import { Form, Formik } from 'formik';
import { useState } from 'react';
import Button from '/components/button';
import Input from '/components/input';
import Label from '/components/label';
import supabase from '/utilities/browser-supabase-client';
import globalStringCache from '/utilities/global-string-cache';

const SendResetPasswordLinkForm = () => {
  const [linkSent, setLinkSent] = useState(false);

  return (
    <Formik
      initialValues={{ email: globalStringCache.get('email') }}
      onSubmit={async ({ email }, { setSubmitting }) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/forgot-password/reset`,
        });

        if (error) alert(error.message);
        else setLinkSent(true);
        setSubmitting(false);
      }}
    >
      {({ isSubmitting }) => (
        <Form>
          <Label className="mt-9">
            Email address
            <Input disabled={linkSent} name="email" placeholder="jane@example.com" type="email" />
          </Label>
          <Button
            className="mt-12"
            disabled={linkSent}
            loading={isSubmitting}
            loadingText="Sending link…"
            type="submit"
          >
            {linkSent ? (
              <>Link sent&mdash;check your email</>
            ) : (
              <>
                Send link
                <ArrowRightIcon className="w-5" />
              </>
            )}
          </Button>
        </Form>
      )}
    </Formik>
  );
};

export default SendResetPasswordLinkForm;
