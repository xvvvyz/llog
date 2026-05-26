import * as cardAnalysis from '@/domain/cards/analysis';
import * as cardOutput from '@/domain/cards/output';
import * as exactOutput from './exact-output';
import { asRecord, cleanTitle } from './utils';

export const parseCardOutputResult = ({
  allowExactMetricLabelOverrides,
  appendMissingExactMetrics,
  exactFacts,
  parsedJson,
  previousOutput,
}: {
  allowExactMetricLabelOverrides?: boolean;
  appendMissingExactMetrics?: boolean;
  exactFacts?: cardAnalysis.ExactCardFacts;
  parsedJson: unknown;
  previousOutput?: cardOutput.CardOutput;
}) => {
  const root = asRecord(parsedJson);

  const normalizedJson = exactOutput.mergeExactCardOutput({
    allowExactMetricLabelOverrides,
    appendMissingExactMetrics,
    exactFacts,
    output: cardOutput.normalizeRawCardOutput(
      root.output
    ) as cardOutput.CardOutput,
    previousOutput,
  });

  const parsedOutput = cardOutput.validateCardOutput(normalizedJson);

  if (!parsedOutput.success) {
    const issues = parsedOutput.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.') || 'output'}: ${issue.message}`)
      .join('; ');

    return {
      errorMessage: `OpenRouter card generation returned invalid output${issues ? ` (${issues})` : ''}`,
      success: false as const,
    };
  }

  const output = cardOutput.normalizeCardOutputMilestoneDates(
    parsedOutput.data
  );

  return { output, root, success: true as const };
};

export const parseGeneratedCardResult = ({
  defaultTitle,
  exactFacts,
  parsedJson,
}: {
  defaultTitle: string;
  exactFacts?: cardAnalysis.ExactCardFacts;
  parsedJson: unknown;
}) => {
  const parsedOutput = parseCardOutputResult({ exactFacts, parsedJson });
  if (!parsedOutput.success) return parsedOutput;

  return {
    output: parsedOutput.output,
    success: true as const,
    title: cleanTitle(parsedOutput.root.title, defaultTitle),
  };
};

export const parseTweakedCardResult = ({
  defaultTitle,
  exactFacts,
  parsedJson,
  previousOutput,
  tweakPrompt,
}: {
  defaultTitle: string;
  exactFacts?: cardAnalysis.ExactCardFacts;
  parsedJson: unknown;
  previousOutput?: cardOutput.CardOutput;
  tweakPrompt?: string;
}) => {
  const parsedOutput = parseCardOutputResult({
    allowExactMetricLabelOverrides:
      !!tweakPrompt && labelTweakRequested(tweakPrompt),
    appendMissingExactMetrics: false,
    exactFacts,
    parsedJson,
    previousOutput,
  });

  if (!parsedOutput.success) return parsedOutput;

  return {
    output: parsedOutput.output,
    success: true as const,
    title: cleanTitle(parsedOutput.root.title, defaultTitle),
  };
};

const labelTweakRequested = (value: string) =>
  /\b(?:label|rename|name|caption|wording)\b/i.test(value) ||
  /\bcall(?:ed)?\s+(?:it|this|that|the\s+(?:metric|stat|number))?\b/i.test(
    value
  ) ||
  /\bmake\s+(?:it|the\s+(?:metric|stat|label|number))\s+say\b/i.test(value);
