'use client';

import { PlusIcon } from '@heroicons/react/24/solid';
import Button from 'components/button';
import Input from 'components/input';
import Label from 'components/label';
import Select from 'components/select';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Database } from 'types/database';
import supabase from 'utilities/browser-supabase-client';
import firstIfArray from 'utilities/first-if-array';
import forceArray from 'utilities/force-array';
import { GetInputData } from 'utilities/get-input';
import globalValueCache from 'utilities/global-value-cache';
import { ListInputTypesData } from 'utilities/list-input-types';
import sleep from 'utilities/sleep';

const DEFAULT_OPTION_VALUES = { input_id: '', label: '', order: 0 };

interface InputFormProps {
  input?: GetInputData;
  inputTypes?: ListInputTypesData;
}

type InputFormValues = Database['public']['Tables']['inputs']['Insert'] & {
  options: Database['public']['Tables']['input_options']['Insert'][];
  type: Database['public']['Tables']['input_types']['Insert'];
};

const InputForm = ({ input, inputTypes }: InputFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<InputFormValues>({
    defaultValues: {
      id: input?.id,
      label: input?.label ?? '',
      options: forceArray(input?.options),
      type: firstIfArray(input?.type),
    },
  });

  const optionsArray = useFieldArray({
    control: form.control,
    name: 'options',
  });

  const type = form.watch('type')?.id;
  const hasOptions = type === 'select' || type === 'multi_select';

  useEffect(() => {
    if (!hasOptions || optionsArray.fields.length > 0) return;
    optionsArray.append(DEFAULT_OPTION_VALUES);
  }, [hasOptions]);

  return (
    <form
      onSubmit={form.handleSubmit(async ({ id, label, options, type }) => {
        const { data: inputData, error: inputError } = await supabase
          .from('inputs')
          .upsert({ id, label, type: type.id })
          .select('id, label')
          .single();

        if (inputError) {
          alert(inputError?.message);
          return;
        }

        form.setValue('id', inputData.id);

        if (hasOptions) {
          const { newOptions, updatedOptions } = options.reduce(
            (acc, option, order) => {
              option.input_id = inputData.id;
              option.order = order;
              if (option.id) acc.updatedOptions.push(option);
              else acc.newOptions.push(option);
              return acc;
            },
            {
              newOptions: [] as InputFormValues['options'],
              updatedOptions: [] as InputFormValues['options'],
            }
          );

          if (updatedOptions.length) {
            const { error: inputOptionsError } = await supabase
              .from('input_options')
              .upsert(updatedOptions.sort((a, b) => b.order - a.order));

            if (inputOptionsError) {
              alert(inputOptionsError.message);
              return;
            }
          }

          if (newOptions.length) {
            const { error: inputOptionsError } = await supabase
              .from('input_options')
              .insert(newOptions);

            if (inputOptionsError) {
              alert(inputOptionsError.message);
              return;
            }
          }
        }

        if (globalValueCache.has('observation_type_form_values')) {
          const cache = globalValueCache.get('observation_type_form_values');
          cache.inputs.push(inputData);
          globalValueCache.set('observation_type_form_values', cache);
        }

        await router.push(searchParams.get('back') ?? '/inputs');
        await router.refresh();
        await sleep();
      })}
    >
      <Label>
        Label
        <Controller
          control={form.control}
          name="label"
          render={({ field }) => <Input {...field} />}
        />
      </Label>
      <Label className="mt-6">
        Type
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Select options={forceArray(inputTypes)} {...field} />
          )}
        />
      </Label>
      {hasOptions && (
        <fieldset className="mt-6">
          <legend className="text-fg-2">Options</legend>
          <ul className="flex flex-col gap-3 pt-2">
            {optionsArray.fields.map((option, optionIndex) => (
              <li key={option.id}>
                <Controller
                  control={form.control}
                  name={`options.${optionIndex}.label`}
                  render={({ field }) => (
                    <Input placeholder="Option label…" {...field} />
                  )}
                />
              </li>
            ))}
          </ul>
          <Button
            className="mt-3 w-full"
            colorScheme="transparent"
            onClick={() => optionsArray.append(DEFAULT_OPTION_VALUES)}
            size="sm"
            type="button"
          >
            <PlusIcon className="w-5" />
            Add option
          </Button>
        </fieldset>
      )}
      <Button
        className="mt-12 w-full"
        loading={form.formState.isSubmitting}
        loadingText="Saving…"
        type="submit"
      >
        Save
      </Button>
    </form>
  );
};

export default InputForm;
