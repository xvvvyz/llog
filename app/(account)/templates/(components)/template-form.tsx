'use client';

import Button from '(components)/button';
import Input from '(components)/input';
import Label, { LabelSpan } from '(components)/label';
import RadioGroup from '(components)/radio-group';
import RichTextarea from '(components)/rich-textarea';
import Select from '(components)/select';
import { Database, Json } from '(types)/database';
import { EventTemplateData } from '(types)/event-template';
import supabase from '(utilities)/browser-supabase-client';
import CacheKeys from '(utilities)/enum-cache-keys';
import TemplateTypes from '(utilities)/enum-template-types';
import forceArray from '(utilities)/force-array';
import formatCacheLink from '(utilities)/format-cache-link';
import useDefaultValues from '(utilities)/get-default-values';
import { GetTemplateData } from '(utilities)/get-template';
import globalValueCache from '(utilities)/global-value-cache';
import { ListInputsData } from '(utilities)/list-inputs';
import sanitizeHtml from '(utilities)/sanitize-html';
import useBackLink from '(utilities)/use-back-link';
import useSubmitRedirect from '(utilities)/use-submit-redirect';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';

interface TemplateFormProps {
  availableInputs: ListInputsData;
  template?: GetTemplateData;
}

type TemplateFormValues = Database['public']['Tables']['templates']['Row'] & {
  content: string;
  inputs: Database['public']['Tables']['inputs']['Row'][];
};

const TemplateForm = ({ availableInputs, template }: TemplateFormProps) => {
  const [isTransitioning, startTransition] = useTransition();
  const [redirect, isRedirecting] = useSubmitRedirect();
  const backLink = useBackLink({ useCache: true });
  const router = useRouter();
  const templateData = template?.data as unknown as EventTemplateData;

  const defaultValues = useDefaultValues({
    cacheKey: CacheKeys.TemplateForm,
    defaultValues: {
      content: templateData?.content,
      id: template?.id,
      inputs: forceArray(templateData?.inputIds).map((inputId) =>
        availableInputs?.find(({ id }) => id === inputId)
      ),
      name: template?.name ?? '',
      public: template?.public ?? false,
      type: template?.type ?? TemplateTypes.Observation,
    },
  });

  const form = useForm<TemplateFormValues>({ defaultValues });

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit(
        async ({ content, id, inputs, name, public: p, type }) => {
          const { error: templateError } = await supabase
            .from('templates')
            .upsert({
              data: {
                content: sanitizeHtml(content),
                inputIds: inputs.map((input) => input.id),
              } as Json,
              id,
              name: name.trim(),
              public: p,
              type,
            })
            .single();

          if (templateError) {
            alert(templateError?.message);
            return;
          }

          await redirect('/templates');
        }
      )}
    >
      <Label>
        <LabelSpan>Type</LabelSpan>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <RadioGroup
              options={[
                { label: 'Observation', value: TemplateTypes.Observation },
                { label: 'Routine', value: TemplateTypes.Routine },
              ]}
              {...field}
            />
          )}
        />
      </Label>
      <Label>
        <LabelSpan>Name</LabelSpan>
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => <Input {...field} />}
        />
      </Label>
      <Label>
        <LabelSpan>Description</LabelSpan>
        <Controller
          control={form.control}
          name="content"
          render={({ field }) => <RichTextarea {...field} />}
        />
      </Label>
      <Label>
        <LabelSpan>Inputs</LabelSpan>
        <Controller
          control={form.control}
          name="inputs"
          render={({ field }) => (
            <Select
              creatable
              isLoading={isTransitioning}
              isMulti
              noOptionsMessage={() => null}
              onCreateOption={async (value: unknown) => {
                globalValueCache.set(CacheKeys.InputForm, { label: value });
                globalValueCache.set(CacheKeys.TemplateForm, form.getValues());

                startTransition(() =>
                  router.push(
                    formatCacheLink({
                      backLink,
                      path: '/inputs/add',
                      updateCacheKey: CacheKeys.TemplateForm,
                      updateCachePath: 'inputs',
                      useCache: true,
                    })
                  )
                );
              }}
              options={availableInputs ?? []}
              {...field}
            />
          )}
        />
      </Label>
      <Button
        className="mt-4 w-full"
        loading={form.formState.isSubmitting || isRedirecting}
        loadingText="Saving…"
        type="submit"
      >
        Save
      </Button>
    </form>
  );
};

export default TemplateForm;