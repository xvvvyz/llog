'use client';

import Button from '@/_components/button';
import Checkbox from '@/_components/checkbox';
import Input from '@/_components/input';
import NumberInput from '@/_components/input-number';
import RichTextarea from '@/_components/rich-textarea';
import Select, { IOption } from '@/_components/select';
import InputTypes from '@/_constants/enum-input-types';
import useSubmitRedirect from '@/_hooks/use-submit-redirect';
import useSupabase from '@/_hooks/use-supabase';
import { GetEventData } from '@/_server/get-event';
import { GetEventTypeWithInputsAndOptionsData } from '@/_server/get-event-type-with-inputs-and-options';
import { GetSessionWithDetailsData } from '@/_server/get-session-with-details';
import { Database } from '@/_types/database';
import forceArray from '@/_utilities/force-array';
import formatDatetimeLocal from '@/_utilities/format-datetime-local';
import parseSeconds from '@/_utilities/parse-seconds';
import sanitizeHtml from '@/_utilities/sanitize-html';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { PropsValue } from 'react-select';
import { twMerge } from 'tailwind-merge';
import EventSelect from './event-select';
import EventStopwatch from './event-stopwatch';

interface EventFormProps {
  className?: string;
  disabled: boolean;
  event?:
    | GetEventData
    | NonNullable<GetSessionWithDetailsData>['modules'][0]['event'][0];
  eventType:
    | NonNullable<NonNullable<GetEventData>['type']>
    | NonNullable<GetEventTypeWithInputsAndOptionsData>
    | NonNullable<GetSessionWithDetailsData>['modules'][0];
  isMission?: boolean;
  isPublic?: boolean;
  subjectId: string;
}

type CheckboxInputType = boolean;
type DurationInputTypeOption = { id: string; label: string };

type DurationInputType = [
  DurationInputTypeOption,
  DurationInputTypeOption,
  DurationInputTypeOption,
];

type MultiSelectInputType = Array<{ id: string; label: string }>;
type NumberInputType = string;
type SelectInputType = { id: string; label: string } | null;
type StopwatchInputType = string;

interface EventFormValues {
  comment?: string;
  completionTime?: string;
  id?: string;
  inputs: Array<
    | CheckboxInputType
    | DurationInputType
    | MultiSelectInputType
    | NumberInputType
    | SelectInputType
    | StopwatchInputType
  >;
}

const EventForm = ({
  className,
  disabled,
  event,
  eventType,
  isMission,
  isPublic,
  subjectId,
}: EventFormProps) => {
  const [redirect, isRedirecting] = useSubmitRedirect();
  const eventInputs = forceArray(event?.inputs);
  const eventTypeInputs = forceArray(eventType?.inputs);
  const supabase = useSupabase();

  const form = useForm<EventFormValues>({
    defaultValues: {
      completionTime: formatDatetimeLocal(event?.created_at ?? new Date()),
      id: event?.id,
      inputs: eventTypeInputs.map(({ input }) => {
        const inputInputs = eventInputs.filter(
          ({ input_id }) => input_id === input.id,
        );

        switch (input.type) {
          case InputTypes.Checkbox: {
            return Boolean(inputInputs[0]?.value ?? false);
          }

          case InputTypes.Duration: {
            if (!inputInputs[0]?.value) return [];

            const { hours, minutes, seconds } = parseSeconds(
              inputInputs[0].value,
            );

            return [
              { id: String(hours), label: `${Number(hours)}h` },
              { id: String(minutes), label: `${Number(minutes)}m` },
              { id: String(seconds), label: `${Number(seconds)}s` },
            ];
          }

          case InputTypes.Number:
          case InputTypes.Stopwatch: {
            return inputInputs[0]?.value ?? '';
          }

          case InputTypes.MultiSelect: {
            return inputInputs.map(({ input_option_id }) =>
              input.options.find(
                ({
                  id,
                }: Database['public']['Tables']['input_options']['Row']) =>
                  input_option_id === id,
              ),
            );
          }

          case InputTypes.Select: {
            return (
              input.options.find(
                ({
                  id,
                }: Database['public']['Tables']['input_options']['Row']) =>
                  id === inputInputs[0]?.input_option_id,
              ) ?? null
            );
          }
        }
      }),
    },
  });

  useEffect(() => {
    if (!isMission || event) return;

    const interval: NodeJS.Timeout = setInterval(() => {
      if (form.formState.dirtyFields.completionTime) {
        clearInterval(interval);
        return;
      }

      form.setValue('completionTime', formatDatetimeLocal(new Date()));
    }, 1000);

    return () => clearInterval(interval);
  }, [event, form, isMission]);

  return (
    <form
      className={twMerge('flex flex-col gap-6 print:gap-0', className)}
      onSubmit={form.handleSubmit(
        async ({ comment, completionTime, id, inputs }) => {
          if (isPublic) return;

          const { data: eventData, error: eventError } = await supabase
            .from('events')
            .upsert({
              created_at: completionTime
                ? new Date(completionTime).toISOString()
                : undefined,
              event_type_id: eventType.id,
              id,
              subject_id: subjectId,
            })
            .select('created_at, id')
            .single();

          if (eventError) {
            alert(eventError.message);
            return;
          }

          form.setValue('id', eventData.id);

          form.setValue(
            'completionTime',
            formatDatetimeLocal(eventData.created_at),
          );

          const deletedEventInputs = eventInputs.map(({ id }) => id);

          if (deletedEventInputs.length) {
            const { error: deletedEventInputsError } = await supabase
              .from('event_inputs')
              .delete()
              .in('id', deletedEventInputs);

            if (deletedEventInputsError) {
              alert(deletedEventInputsError.message);
              return;
            }
          }

          const { insertedEventInputs } = inputs.reduce(
            (acc, input, i) => {
              if (
                input === '' ||
                input === null ||
                (Array.isArray(input) && !input.some((v) => v))
              ) {
                return acc;
              }

              const eventTypeInput = eventTypeInputs[i].input;

              const payload: Database['public']['Tables']['event_inputs']['Insert'] =
                {
                  event_id: eventData.id,
                  input_id: eventTypeInput.id,
                  input_option_id: null,
                  value: null,
                };

              switch (eventTypeInput.type) {
                case InputTypes.Checkbox:
                case InputTypes.Number:
                case InputTypes.Stopwatch: {
                  payload.value = input;
                  acc.insertedEventInputs.push(payload);
                  return acc;
                }

                case InputTypes.Duration: {
                  payload.value = String(
                    Number((input as DurationInputType)[0]?.id || 0) * 60 * 60 +
                      Number((input as DurationInputType)[1]?.id || 0) * 60 +
                      Number((input as DurationInputType)[2]?.id || 0),
                  );

                  acc.insertedEventInputs.push(payload);
                  return acc;
                }

                case InputTypes.MultiSelect: {
                  (input as MultiSelectInputType).forEach(({ id }, order) =>
                    acc.insertedEventInputs.push({
                      ...payload,
                      input_option_id: id,
                      order,
                    }),
                  );

                  return acc;
                }

                case InputTypes.Select: {
                  payload.input_option_id = (input as SelectInputType)?.id;
                  acc.insertedEventInputs.push(payload);
                  return acc;
                }

                default: {
                  return acc;
                }
              }
            },
            {
              insertedEventInputs: [] as Array<
                Database['public']['Tables']['event_inputs']['Insert']
              >,
            },
          );

          if (insertedEventInputs.length) {
            const { error: insertedEventInputsError } = await supabase
              .from('event_inputs')
              .insert(insertedEventInputs);

            if (insertedEventInputsError) {
              alert(insertedEventInputsError.message);
              return;
            }
          }

          if (comment) {
            const { error: commentError } = await supabase
              .from('comments')
              .insert({
                content: sanitizeHtml(comment) as string,
                event_id: eventData.id,
              });

            if (commentError) {
              alert(commentError.message);
              return;
            }
          }

          await redirect(`/subjects/${subjectId}`, {
            redirect: !isMission && !event,
          });
        },
      )}
    >
      <Input
        id={`${eventType.id}-completionTime`}
        label={isMission ? 'When was this completed?' : 'When did this happen?'}
        max={formatDatetimeLocal(
          (() => {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
          })(),
        )}
        step="any"
        type="datetime-local"
        {...form.register('completionTime')}
      />
      {eventTypeInputs.map(({ input }, i) => {
        const id = `${eventType.id}-inputs-${i}`;

        return (
          <div key={id}>
            {input.type === InputTypes.Checkbox && (
              <Checkbox label={input.label} {...form.register(`inputs.${i}`)} />
            )}
            {input.type === InputTypes.Duration && (
              <fieldset>
                <legend className="label">{input.label}</legend>
                <div className="grid grid-cols-3 print:hidden">
                  <Controller
                    control={form.control}
                    name={`inputs.${i}.0`}
                    render={({ field }) => (
                      <Select
                        className="rounded-r-none border-r-0"
                        inputType="number"
                        isClearable={false}
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={(value) => field.onChange(value)}
                        options={Array.from({ length: 24 }, (_, i) => ({
                          id: String(i),
                          label: `${i}h`,
                        }))}
                        placeholder="Hours"
                        value={field.value as PropsValue<IOption>}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name={`inputs.${i}.1`}
                    render={({ field }) => (
                      <Select
                        className="rounded-none"
                        inputType="number"
                        isClearable={false}
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={(value) => field.onChange(value)}
                        options={Array.from({ length: 60 }, (_, i) => ({
                          id: String(i),
                          label: `${i}m`,
                        }))}
                        placeholder="Minutes"
                        value={field.value as PropsValue<IOption>}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name={`inputs.${i}.2`}
                    render={({ field }) => (
                      <Select
                        className="rounded-l-none border-l-0"
                        inputType="number"
                        isClearable={false}
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={(value) => field.onChange(value)}
                        options={Array.from({ length: 60 }, (_, i) => ({
                          id: String(i),
                          label: `${i}s`,
                        }))}
                        placeholder="Seconds"
                        value={field.value as PropsValue<IOption>}
                      />
                    )}
                  />
                </div>
              </fieldset>
            )}
            {input.type === InputTypes.Number && (
              <Controller
                control={form.control}
                name={`inputs.${i}`}
                render={({ field }) => (
                  <NumberInput
                    label={input.label}
                    name={field.name}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    value={field.value}
                    {...input.settings}
                  />
                )}
              />
            )}
            {(input.type === InputTypes.MultiSelect ||
              input.type === InputTypes.Select) && (
              <Controller
                control={form.control}
                name={`inputs.${i}`}
                render={({ field }) => (
                  <EventSelect field={field} input={input} />
                )}
              />
            )}
            {input.type === InputTypes.Stopwatch && (
              <EventStopwatch<EventFormValues>
                form={form}
                input={input}
                inputIndex={i}
              />
            )}
          </div>
        );
      })}
      {!event && (
        <Controller
          control={form.control}
          name="comment"
          render={({ field }) => <RichTextarea label="Comment" {...field} />}
        />
      )}
      {!isPublic && (
        <Button
          className="mt-8 w-full print:hidden"
          colorScheme={event ? 'transparent' : 'accent'}
          disabled={disabled}
          loading={form.formState.isSubmitting || isRedirecting}
          loadingText="Saving…"
          type="submit"
        >
          {event
            ? 'Save inputs'
            : isMission
              ? 'Mark as complete'
              : 'Record event'}
        </Button>
      )}
    </form>
  );
};

export type { EventFormValues, MultiSelectInputType, SelectInputType };
export default EventForm;