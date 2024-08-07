'use client';

import BackButton from '@/_components/back-button';
import Button from '@/_components/button';
import Checkbox from '@/_components/checkbox';
import CollapsibleSection from '@/_components/collapsible-section';
import Input from '@/_components/input';
import PlotFigure from '@/_components/plot-figure';
import Select, { IOption } from '@/_components/select';
import UnsavedChangesBanner from '@/_components/unsaved-changes-banner';
import BarInterval from '@/_constants/enum-bar-interval';
import BarReducer from '@/_constants/enum-bar-reducer';
import ChartType from '@/_constants/enum-chart-type';
import LineCurveFunction from '@/_constants/enum-line-curve-function';
import TimeSinceMilliseconds from '@/_constants/enum-time-since-milliseconds';
import useCachedForm from '@/_hooks/use-cached-form';
import upsertInsight from '@/_mutations/upsert-insight';
import { GetInsightData } from '@/_queries/get-insight';
import { ListEventsData } from '@/_queries/list-events';
import { InsightConfigJson } from '@/_types/insight-config-json';
import getFormCacheKey from '@/_utilities/get-form-cache-key';
import getInputDetailsFromEvents from '@/_utilities/get-input-details-from-events';
import getInsightOptionsFromEvents from '@/_utilities/get-insight-options-from-events';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Controller } from 'react-hook-form';

const INCLUDE_EVENTS_SINCE_OPTIONS = [
  { id: TimeSinceMilliseconds.Week, label: '1 week ago' },
  { id: TimeSinceMilliseconds.Month, label: '1 month ago' },
  { id: TimeSinceMilliseconds.Quarter, label: '3 months ago' },
  { id: TimeSinceMilliseconds.Half, label: '6 months ago' },
  { id: TimeSinceMilliseconds.Year, label: '1 year ago' },
];

const LINE_CURVE_FUNCTION_OPTIONS = [
  { id: LineCurveFunction.Linear, label: 'Linear' },
  { id: LineCurveFunction.Basis, label: 'Basis' },
  { id: LineCurveFunction.Bundle, label: 'Bundle' },
  { id: LineCurveFunction.CatmullRom, label: 'Catmull-rom' },
  { id: LineCurveFunction.Step, label: 'Step' },
];

const BAR_INTERVAL_OPTIONS = [
  { id: BarInterval.Day, label: 'Day' },
  { id: BarInterval.Week, label: 'Week' },
  { id: BarInterval.Month, label: 'Month' },
  { id: BarInterval.Quarter, label: '3 months' },
  { id: BarInterval.Half, label: '6 months' },
  { id: BarInterval.Year, label: 'Year' },
];

const BAR_REDUCER_OPTIONS = [
  { id: BarReducer.Count, isDisabled: false, label: 'Count' },
  { id: BarReducer.Mean, isDisabled: false, label: 'Average' },
  { id: BarReducer.Sum, isDisabled: false, label: 'Sum' },
  { id: BarReducer.Min, isDisabled: false, label: 'Min' },
  { id: BarReducer.Max, isDisabled: false, label: 'Max' },
];

interface InsightFormProps {
  events: NonNullable<ListEventsData>;
  insight?: NonNullable<GetInsightData>;
  subjectId: string;
}

type InsightFormValues = InsightConfigJson & {
  name: string;
};

const InsightForm = ({ events, insight, subjectId }: InsightFormProps) => {
  const [isTransitioning, startTransition] = useTransition();
  const cacheKey = getFormCacheKey.insight({ id: insight?.id, subjectId });
  const config = insight?.config as InsightConfigJson;
  const router = useRouter();

  const form = useCachedForm<InsightFormValues>(cacheKey, {
    defaultValues: {
      barInterval: config?.barInterval ?? BarInterval.Day,
      barReducer: config?.barReducer ?? BarReducer.Mean,
      includeEventsFrom: config?.includeEventsFrom ?? null,
      includeEventsSince: config?.includeEventsSince ?? null,
      input: config?.input,
      lineCurveFunction: config?.lineCurveFunction ?? LineCurveFunction.Linear,
      marginBottom: config?.marginBottom ?? '60',
      marginLeft: config?.marginLeft ?? '60',
      marginRight: config?.marginRight ?? '40',
      marginTop: config?.marginTop ?? '30',
      name: insight?.name ?? '',
      showBars: config?.showBars ?? false,
      showDots: config?.showDots ?? true,
      showLine: config?.showLine ?? false,
      showLinearRegression: config?.showLinearRegression ?? false,
      type: config?.type ?? ChartType.TimeSeries,
    },
  });

  const inputId = form.watch('input');
  const showBars = form.watch('showBars');
  const showDots = form.watch('showDots');
  const showLine = form.watch('showLine');
  const showLinearRegression = form.watch('showLinearRegression');

  const { isInputNominal } = getInputDetailsFromEvents({ events, inputId });

  const { eventTypeOptions, inputOptions, trainingPlanOptions } =
    getInsightOptionsFromEvents({ events, inputId });

  const eventTypeOrTrainingPlanOptions = [
    { label: 'Event types', options: eventTypeOptions },
    { label: 'Training plans', options: trainingPlanOptions },
  ];

  const onMarkOrInputChange = ({
    inputId,
    showBars,
    showDots,
    showLine,
    showLinearRegression,
  }: {
    inputId: string;
    showBars?: boolean;
    showDots?: boolean;
    showLine?: boolean;
    showLinearRegression?: boolean;
  }) => {
    const { isInputNominal } = getInputDetailsFromEvents({ events, inputId });

    if (isInputNominal) {
      if (showDots || showLine || showLinearRegression) {
        form.setValue('showBars', false);
      } else if (showBars) {
        form.setValue('barReducer', BarReducer.Count);
        form.setValue('showDots', false);
        form.setValue('showLine', false);
        form.setValue('showLinearRegression', false);
      }
    } else {
      if (showBars) {
        form.setValue('barReducer', BarReducer.Mean);
      }
    }
  };

  return (
    <form
      className="flex flex-col gap-8 px-4 pb-8 pt-6 sm:px-8"
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const res = await upsertInsight(
            { insightId: insight?.id, subjectId },
            values,
          );

          if (res?.error) {
            form.setError('root', { message: res.error, type: 'custom' });
            return;
          }

          router.back();
        }),
      )}
    >
      <div className="grid gap-6 md:grid-cols-3 md:gap-4">
        <Input label="Name" required {...form.register('name')} />
        <div className="md:col-span-2">
          <Controller
            control={form.control}
            name="input"
            render={({ field }) => (
              <Select
                isClearable={false}
                label="Input"
                name={field.name}
                noOptionsMessage={() => 'No inputs have been recorded.'}
                onBlur={field.onBlur}
                onChange={(value) => {
                  const inputId = (value as IOption).id;
                  field.onChange(inputId);
                  form.setValue('includeEventsFrom', null);
                  form.setValue('includeEventsSince', null);

                  onMarkOrInputChange({
                    inputId,
                    showBars,
                    showDots,
                    showLine,
                    showLinearRegression,
                  });
                }}
                options={inputOptions}
                placeholder="Select an input…"
                value={inputOptions.find((o) => field.value === o.id)}
              />
            )}
          />
        </div>
      </div>
      <div className="rounded border border-alpha-1 bg-bg-3 drop-shadow-2xl">
        <PlotFigure
          barInterval={form.watch('barInterval')}
          barReducer={form.watch('barReducer')}
          defaultHeight={200}
          events={events}
          includeEventsFrom={form.watch('includeEventsFrom')}
          includeEventsSince={form.watch('includeEventsSince')}
          inputId={inputId}
          lineCurveFunction={form.watch('lineCurveFunction')}
          marginBottom={form.watch('marginBottom')}
          marginLeft={form.watch('marginLeft')}
          marginRight={form.watch('marginRight')}
          marginTop={form.watch('marginTop')}
          showBars={showBars}
          showDots={form.watch('showDots')}
          showLine={showLine}
          showLinearRegression={form.watch('showLinearRegression')}
          subjectId={subjectId}
          title={form.watch('name')}
          type={form.watch('type')}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Checkbox
          label="Dots"
          {...form.register('showDots', {
            onChange: (e) =>
              onMarkOrInputChange({ inputId, showDots: e.target.checked }),
          })}
        />
        <Checkbox
          label="Line"
          {...form.register('showLine', {
            onChange: (e) =>
              onMarkOrInputChange({ inputId, showLine: e.target.checked }),
          })}
        />
        <Checkbox
          label="Bars"
          {...form.register('showBars', {
            onChange: (e) =>
              onMarkOrInputChange({ inputId, showBars: e.target.checked }),
          })}
        />
        <Checkbox
          label="Trend"
          {...form.register('showLinearRegression', {
            onChange: (e) =>
              onMarkOrInputChange({
                inputId,
                showLinearRegression: e.target.checked,
              }),
          })}
        />
      </div>
      <CollapsibleSection
        className="grid gap-6 pt-6 md:grid-cols-3 md:gap-4"
        title="Additional options"
        titleClassName="smallcaps"
      >
        <Controller
          control={form.control}
          name="lineCurveFunction"
          render={({ field }) => (
            <Select
              isDisabled={!showLine}
              isClearable={false}
              isSearchable={false}
              label="Line function"
              name={field.name}
              onBlur={field.onBlur}
              onChange={(value) => field.onChange((value as IOption)?.id)}
              options={LINE_CURVE_FUNCTION_OPTIONS as IOption[]}
              value={LINE_CURVE_FUNCTION_OPTIONS.find(
                (o) => o.id === field.value,
              )}
            />
          )}
        />
        <Controller
          control={form.control}
          name="barInterval"
          render={({ field }) => (
            <Select
              isDisabled={!showBars}
              isClearable={false}
              isSearchable={false}
              label="Bar interval"
              name={field.name}
              onBlur={field.onBlur}
              onChange={(value) => field.onChange((value as IOption)?.id)}
              options={BAR_INTERVAL_OPTIONS as IOption[]}
              value={BAR_INTERVAL_OPTIONS.find((o) => o.id === field.value)}
            />
          )}
        />
        <Controller
          control={form.control}
          name="barReducer"
          render={({ field }) => (
            <Select
              isDisabled={!showBars}
              isClearable={false}
              isSearchable={false}
              label="Bar reducer"
              name={field.name}
              onBlur={field.onBlur}
              onChange={(value) => field.onChange((value as IOption)?.id)}
              options={BAR_REDUCER_OPTIONS.map((o) => {
                o.isDisabled = isInputNominal
                  ? o.id !== BarReducer.Count
                  : o.id === BarReducer.Count;

                return o;
              })}
              value={BAR_REDUCER_OPTIONS.find((o) => o.id === field.value)}
            />
          )}
        />
      </CollapsibleSection>
      <CollapsibleSection
        className="grid gap-6 pt-6 md:grid-cols-2 md:gap-4"
        title="Filter events"
        titleClassName="smallcaps"
      >
        <Controller
          control={form.control}
          name="includeEventsFrom"
          render={({ field }) => {
            let value;

            if (field.value) {
              for (const group of eventTypeOrTrainingPlanOptions) {
                value = group.options.find((o) => o.id === field.value);
                if (value) break;
              }
            }

            return (
              <Select
                isSearchable={false}
                label="Events from"
                name={field.name}
                onBlur={field.onBlur}
                onChange={(value) =>
                  field.onChange((value as IOption)?.id ?? null)
                }
                options={eventTypeOrTrainingPlanOptions}
                placeholder="All event types/training plans…"
                value={value}
              />
            );
          }}
        />
        <Controller
          control={form.control}
          name="includeEventsSince"
          render={({ field }) => (
            <Select
              isSearchable={false}
              label="Events since"
              name={field.name}
              onBlur={field.onBlur}
              onChange={(value) =>
                field.onChange((value as IOption)?.id ?? null)
              }
              options={INCLUDE_EVENTS_SINCE_OPTIONS}
              placeholder="The beginning of time…"
              value={INCLUDE_EVENTS_SINCE_OPTIONS.find(
                (o) => field.value === o.id,
              )}
            />
          )}
        />
      </CollapsibleSection>
      <CollapsibleSection
        className="grid grid-cols-2 gap-6 pt-6 md:grid-cols-4 md:gap-4"
        title="Margins"
        titleClassName="smallcaps"
      >
        <Input
          label="Top"
          min={0}
          type="number"
          {...form.register('marginTop')}
        />
        <Input
          label="Bottom"
          min={0}
          type="number"
          {...form.register('marginBottom')}
        />
        <Input
          label="Left"
          min={0}
          type="number"
          {...form.register('marginLeft')}
        />
        <Input
          label="Right"
          min={0}
          type="number"
          {...form.register('marginRight')}
        />
      </CollapsibleSection>
      {form.formState.errors.root && (
        <div className="text-center">{form.formState.errors.root.message}</div>
      )}
      <div className="flex flex-col-reverse justify-between gap-8 pt-8 align-baseline sm:flex-row">
        <UnsavedChangesBanner<InsightFormValues> form={form} />
        <div className="flex justify-center gap-4">
          <BackButton
            className="w-36 shrink-0"
            colorScheme="transparent"
            size="sm"
          >
            Close
          </BackButton>
          <Button
            className="w-36 shrink-0"
            loading={isTransitioning}
            loadingText="Saving…"
            size="sm"
            type="submit"
          >
            Save
          </Button>
        </div>
      </div>
    </form>
  );
};

export type { InsightFormValues };
export default InsightForm;
