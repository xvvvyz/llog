'use client';

import Button from '@/_components/button';
import Input from '@/_components/input';
import Select, { IOption } from '@/_components/select';
import newLead from '@/_mutations/new-lead';
import { Controller, useForm } from 'react-hook-form';

export interface ContactFormValues {
  email: string;
  name: string;
  phone?: string;
  profession?: IOption;
  types: IOption[];
  website?: string;
}

const ContactForm = () => {
  const form = useForm<ContactFormValues>({
    defaultValues: {
      email: '',
      name: '',
      phone: '',
      types: [],
      website: '',
    },
  });

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={form.handleSubmit((values) => newLead(values))}
    >
      <Input label="Name" required {...form.register('name')} />
      <Input
        label="Email address"
        required
        type="email"
        {...form.register('email')}
      />
      <Input label="Phone number" type="tel" {...form.register('phone')} />
      <Input label="Company website" type="url" {...form.register('website')} />
      <Controller
        control={form.control}
        name="profession"
        render={({ field }) => (
          <Select
            isClearable={false}
            isSearchable={false}
            label="Profession"
            name={field.name}
            onBlur={field.onBlur}
            onChange={(value) => field.onChange(value)}
            options={[
              { id: 'trainer', label: 'Trainer' },
              { id: 'veterinarian', label: 'Veterinarian' },
              { id: 'other', label: 'Other' },
            ]}
            placeholder="Select one…"
            value={field.value}
          />
        )}
      />
      <Controller
        control={form.control}
        name="types"
        render={({ field }) => (
          <Select
            isClearable={false}
            isSearchable={false}
            isMulti
            label="Case types"
            name={field.name}
            onBlur={field.onBlur}
            onChange={(value) => field.onChange(value)}
            options={[
              { id: 'aggression', label: 'Aggression' },
              { id: 'anxiety', label: 'Anxiety' },
              { id: 'fear', label: 'Fear' },
              { id: 'reactivity', label: 'Reactivity' },
              { id: 'other', label: 'Other' },
            ]}
            placeholder="Select all that apply…"
            value={field.value}
          />
        )}
      />
      {form.formState.errors.root && (
        <div className="text-center">{form.formState.errors.root.message}</div>
      )}
      {form.formState.isSubmitSuccessful ? (
        <p className="mt-8 text-center">
          Thank you for your interest in llog!
          <br />
          We will be in touch soon.
        </p>
      ) : (
        <Button
          className="mt-8"
          loading={form.formState.isSubmitting}
          loadingText="Requesting…"
          type="submit"
        >
          Request a demo
        </Button>
      )}
    </form>
  );
};

export default ContactForm;