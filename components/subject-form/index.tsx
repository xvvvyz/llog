'use client';

import { Form, Formik } from 'formik';
import { useRouter } from 'next/navigation';
import Button from '/components/button';
import Input from '/components/input';
import Label from '/components/label';
import { Database } from '/supabase/types';
import supabase from '/utilities/browser-supabase-client';
import sleep from '/utilities/sleep';

const SubjectForm = (
  subject: Database['public']['Tables']['subjects']['Update']
) => {
  const router = useRouter();

  return (
    <Formik
      initialValues={{ name: subject?.name ?? '' }}
      onSubmit={async ({ name }) => {
        const { data, error } = await supabase
          .from('subjects')
          .upsert({ id: subject?.id, name })
          .select()
          .single();

        if (error) {
          alert(error?.message);
        } else {
          await router.push(`/subjects/${data.id}`);
          await router.refresh();
          await sleep();
        }
      }}
    >
      {({ isSubmitting }) => (
        <Form>
          <Label>
            Name
            <Input name="name" />
          </Label>
          <Button
            className="mt-12 w-full"
            loading={isSubmitting}
            loadingText="Saving…"
            type="submit"
          >
            Save
          </Button>
        </Form>
      )}
    </Formik>
  );
};

export default SubjectForm;
