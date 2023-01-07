'use client';

import Button from 'components/button';
import Input from 'components/input';
import Label from 'components/label';
import Select from 'components/select';
import Textarea from 'components/textarea';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { Database } from 'types/database';
import supabase from 'utilities/browser-supabase-client';
import firstIfArray from 'utilities/first-if-array';
import forceArray from 'utilities/force-array';
import { GetObservationData } from 'utilities/get-observation';
import globalValueCache from 'utilities/global-value-cache';
import { ListInputsData } from 'utilities/list-inputs';
import sleep from 'utilities/sleep';
import useBackLink from 'utilities/use-back-link';

interface ObservationTypeFormProps {
  availableInputs: ListInputsData;
  observation?: GetObservationData;
}

type ObservationTypeFormValues =
  Database['public']['Tables']['observations']['Insert'] & {
    inputs: Database['public']['Tables']['inputs']['Row'][];
  };

const ObservationTypeForm = ({
  availableInputs,
  observation,
}: ObservationTypeFormProps) => {
  const backLink = useBackLink({ useCache: 'true' });
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<ObservationTypeFormValues>({
    defaultValues:
      searchParams.has('useCache') &&
      globalValueCache.has('observation_type_form_values')
        ? globalValueCache.get('observation_type_form_values')
        : {
            description: observation?.description ?? '',
            inputs: forceArray(observation?.inputs).map(({ input }) => input),
            name: observation?.name ?? '',
          },
  });

  return (
    <form
      onSubmit={form.handleSubmit(async ({ description, inputs, name }) => {
        const { data: observationData, error: observationError } =
          await supabase.rpc('upsert_observations_with_inputs', {
            input_ids: inputs.map(({ id }) => id),
            observation: { description, id: observation?.id, name },
          });

        if (observationError) {
          alert(observationError?.message);
          return;
        }

        if (globalValueCache.has('subject_form_values')) {
          const cache = globalValueCache.get('subject_form_values');

          cache.observations.push({
            id: firstIfArray(observationData).id,
            name,
          });

          globalValueCache.set('subject_form_values', cache);
        }

        await router.push(searchParams.get('back') ?? '/observations');
        await router.refresh();
        await sleep();
      })}
    >
      <Label>
        Name
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => <Input {...field} />}
        />
      </Label>
      <Label className="mt-6">
        Description
        <Controller
          control={form.control}
          name="description"
          render={({ field }) => <Textarea {...field} />}
        />
      </Label>
      <Label className="mt-6">
        Inputs
        <Controller
          control={form.control}
          name="inputs"
          render={({ field }) => (
            <Select
              isMulti
              menuFooter={
                <Button
                  className="underline"
                  href={`/inputs/add?back=${backLink}`}
                  onClick={() =>
                    globalValueCache.set(
                      'observation_type_form_values',
                      form.getValues()
                    )
                  }
                  variant="link"
                >
                  Add input
                </Button>
              }
              options={availableInputs ?? []}
              {...field}
            />
          )}
        />
      </Label>
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

export default ObservationTypeForm;
