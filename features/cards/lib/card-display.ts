import * as cardChart from '@/domain/cards/chart';
import * as cardOutput from '@/domain/cards/output';
import type { CardOutput } from '@/domain/cards/output';
import * as displayText from '@/features/cards/lib/display-text';
import * as time from '@/lib/time';

type DisplayableProgressCard = {
  output?: CardOutput | null;
  type?: string | null;
};

const EMPTY_CARD_SUMMARY = 'No matching records yet';

export const formatCardText = (value: string) =>
  displayText.formatComparisonOperators(time.formatIsoDateTimeInText(value));

export const formatCardSummaryText = (value: string) =>
  displayText.formatComparisonOperators(
    time.formatIsoDateTimeInTextByDay(value)
  );

export const formatCardDisplayLabel = (value: string) =>
  displayText.formatComparisonOperators(
    cardOutput.normalizeCardDisplayLabel({
      maxLength: cardOutput.MAX_CARD_METRIC_LABEL_LENGTH,
      value,
    }) ?? time.formatIsoDateTimeInText(value)
  );

export const hasDisplayableCardOutput = (output?: CardOutput | null) => {
  if (!output) return false;
  const summary = output.summary?.trim();

  return (
    cardChart.isRenderableChart(output.chart) ||
    output.metrics.length > 0 ||
    output.milestones.length > 0 ||
    (!!summary && summary !== EMPTY_CARD_SUMMARY)
  );
};

export const isDisplayableProgressCard = (card: DisplayableProgressCard) =>
  card.type === 'progress' && hasDisplayableCardOutput(card.output);
