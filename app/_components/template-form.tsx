'use client';

import BackButton from '@/_components/back-button';
import Button from '@/_components/button';
import Input from '@/_components/input';
import InputForm from '@/_components/input-form';
import PageModalHeader from '@/_components/page-modal-header';
import RichTextarea from '@/_components/rich-textarea';
import Select, { IOption } from '@/_components/select';
import UnsavedChangesBanner from '@/_components/unsaved-changes-banner';
import useCachedForm from '@/_hooks/use-cached-form';
import upsertTemplate from '@/_mutations/upsert-template';
import { GetInputData } from '@/_queries/get-input';
import { GetTemplateData } from '@/_queries/get-template';
import { ListInputsData } from '@/_queries/list-inputs';
import { ListSubjectsByTeamIdData } from '@/_queries/list-subjects-by-team-id';
import { TemplateDataJson } from '@/_types/template-data-json';
import getFormCacheKey from '@/_utilities/get-form-cache-key';
import stopPropagation from '@/_utilities/stop-propagation';
import { Dialog, DialogPanel } from '@headlessui/react';
import { sortBy } from 'lodash';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Controller, useFieldArray } from 'react-hook-form';

interface TemplateFormProps {
  availableInputs: NonNullable<ListInputsData>;
  disableCache?: boolean;
  isDuplicate?: boolean;
  onClose?: () => void;
  onSubmit?: () => void;
  subjects: NonNullable<ListSubjectsByTeamIdData>;
  template?: Partial<GetTemplateData>;
}

type TemplateFormValues = {
  content: string;
  inputs: NonNullable<ListInputsData>;
  name: string;
};

const TemplateForm = ({
  availableInputs,
  disableCache,
  isDuplicate,
  onClose,
  onSubmit,
  subjects,
  template,
}: TemplateFormProps) => {
  const [createInputModal, setCreateInputModal] =
    useState<Partial<GetInputData>>(null);

  const [isTransitioning, startTransition] = useTransition();
  const cacheKey = getFormCacheKey.template({ id: template?.id, isDuplicate });
  const router = useRouter();
  const templateData = template?.data as TemplateDataJson;

  const form = useCachedForm<TemplateFormValues>(
    cacheKey,
    {
      defaultValues: {
        content: templateData?.content ?? '',
        inputs: availableInputs.filter(({ id }) =>
          templateData?.inputIds?.includes(id),
        ),
        name: template?.name ?? '',
      },
    },
    { disableCache },
  );

  const inputsArray = useFieldArray({ control: form.control, name: 'inputs' });

  return (
    <>
      <form
        className="flex flex-col gap-8 px-4 pb-8 pt-6 sm:px-8"
        onSubmit={stopPropagation(
          form.handleSubmit((values) =>
            startTransition(async () => {
              const res = await upsertTemplate(
                { templateId: template?.id },
                values,
              );

              if (res?.error) {
                form.setError('root', { message: res.error, type: 'custom' });
              } else if (res?.data) {
                onSubmit?.();
                if (!onClose) router.back();
              }
            }),
          ),
        )}
      >
        <Input
          label="Name"
          maxLength={49}
          required
          {...form.register('name')}
        />
        <Controller
          control={form.control}
          name="content"
          render={({ field }) => (
            <RichTextarea label="Description or instructions" {...field} />
          )}
        />
        <Controller
          control={form.control}
          name="inputs"
          render={({ field }) => (
            <Select
              formatCreateLabel={(value) => `Create "${value}" input`}
              isCreatable
              isMulti
              label="Inputs"
              name={field.name}
              noOptionsMessage={() => 'Type to create a new input.'}
              onBlur={field.onBlur}
              onChange={(value) => field.onChange(value)}
              onCreateOption={(value) => setCreateInputModal({ label: value })}
              options={sortBy(availableInputs, 'subjects[0].name') as IOption[]}
              placeholder="Select inputs or type to create…"
              value={field.value as IOption[]}
            />
          )}
        />
        {form.formState.errors.root && (
          <div className="text-center">
            {form.formState.errors.root.message}
          </div>
        )}
        <div className="flex gap-4 pt-8">
          <BackButton
            className="w-full"
            colorScheme="transparent"
            onClick={onClose}
          >
            Close
          </BackButton>
          <Button
            className="w-full"
            loading={isTransitioning}
            loadingText="Saving…"
            type="submit"
          >
            Save
          </Button>
        </div>
        {!disableCache && (
          <UnsavedChangesBanner<TemplateFormValues> form={form} />
        )}
      </form>
      <Dialog
        onClose={() => setCreateInputModal(null)}
        open={!!createInputModal}
      >
        <div className="fixed inset-0 z-20 bg-alpha-reverse-1 backdrop-blur-sm" />
        <div className="fixed inset-0 z-30 overflow-y-auto py-16">
          <div className="flex min-h-full items-start justify-center">
            <DialogPanel className="relative w-full max-w-lg rounded border-y border-alpha-1 bg-bg-2 drop-shadow-2xl sm:border-x">
              <PageModalHeader
                onClose={() => setCreateInputModal(null)}
                title="New input"
              />
              <InputForm
                disableCache
                input={createInputModal}
                onClose={() => setCreateInputModal(null)}
                onSubmit={(values) => {
                  inputsArray.append(values);
                  setCreateInputModal(null);
                  router.refresh();
                }}
                subjects={subjects}
              />
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export type { TemplateFormValues };
export default TemplateForm;
