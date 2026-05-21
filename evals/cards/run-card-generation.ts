import * as openrouter from '@/api/cards/openrouter';
import type { CardBlueprint } from '@/domain/cards/blueprint';
import * as cardOutput from '@/domain/cards/output';
import { readFile } from 'node:fs/promises';

type EvalMode = 'blueprint' | 'generate' | 'refresh' | 'tweak';

type EvalScenario = {
  blueprint?: CardBlueprint;
  previousOutputKind?: 'durationEndpoints' | 'durationProgressStart';
  previousOutput?: cardOutput.CardOutput;
  previousRecordCount?: number;
  previousTitle?: string | null;
};

type EvalFixture = {
  name?: string;
  records: openrouter.CardLlmRecord[];
  scenarios?: Partial<Record<Exclude<EvalMode, 'generate'>, EvalScenario>>;
};

type EvalInput = {
  fixturePath: string;
  mode: EvalMode;
  prompt: string;
  tweakPrompt?: string;
};

const titleFromPrompt = (prompt: string) => {
  const firstLine = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return (
    cardOutput.normalizeCardDisplayLabel({
      defaultValue: 'Progress card',
      maxLength: 80,
      value: firstLine ?? prompt,
    }) ?? 'Progress card'
  );
};

const readInput = (): EvalInput => {
  const encoded = process.argv[2];
  if (!encoded) throw new Error('Missing eval input');
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const input = JSON.parse(decoded) as Partial<EvalInput>;

  if (typeof input.fixturePath !== 'string' || !input.fixturePath.trim()) {
    throw new Error('fixturePath is required');
  }

  if (typeof input.prompt !== 'string' || !input.prompt.trim()) {
    throw new Error('prompt is required');
  }

  const mode = input.mode ?? 'generate';

  if (
    mode !== 'blueprint' &&
    mode !== 'generate' &&
    mode !== 'refresh' &&
    mode !== 'tweak'
  ) {
    throw new Error('mode must be blueprint, generate, refresh, or tweak');
  }

  return {
    fixturePath: input.fixturePath,
    mode,
    prompt: input.prompt,
    ...(typeof input.tweakPrompt === 'string' && {
      tweakPrompt: input.tweakPrompt,
    }),
  };
};

const readFixture = async (fixturePath: string): Promise<EvalFixture> => {
  const fixture = JSON.parse(
    await readFile(fixturePath, 'utf8')
  ) as EvalFixture;

  if (!Array.isArray(fixture.records) || fixture.records.length === 0) {
    throw new Error('Fixture records are required');
  }

  return fixture;
};

const sessionValue = (record: openrouter.CardLlmRecord, label: string) => {
  const match = (record.text ?? '').match(
    new RegExp(`${label}:\\s*(\\d+(?:\\.\\d+)?)`)
  );

  if (!match) throw new Error(`Missing ${label} in ${record.id}`);
  return Number(match[1]);
};

const durationValue = (record: openrouter.CardLlmRecord) =>
  sessionValue(record, 'Alone duration \\(min\\)');

const distressValue = (record: openrouter.CardLlmRecord) =>
  sessionValue(record, 'Peak distress \\(0-5\\)');

const chartSeries = ({
  label,
  records,
  unit,
  value,
}: {
  label: string;
  records: openrouter.CardLlmRecord[];
  unit: string;
  value: (record: openrouter.CardLlmRecord) => number;
}) => ({
  data: records.map((record) => ({
    label: String(record.date),
    value: value(record),
  })),
  label,
  unit,
});

const safeIncreaseCount = (records: openrouter.CardLlmRecord[]) =>
  records.slice(1).filter((record, index) => {
    const previous = records[index];

    return (
      durationValue(record) > durationValue(previous) &&
      distressValue(record) <= 2
    );
  }).length;

const durationProgressOutput = (
  records: openrouter.CardLlmRecord[]
): cardOutput.CardOutput => {
  const latest = records.at(-1);
  if (!latest) throw new Error('Previous output records are required');

  const underThreshold = records.filter(
    (record) => distressValue(record) <= 2
  ).length;

  return {
    chart: {
      series: [
        chartSeries({
          label: 'Duration',
          records,
          unit: 'min',
          value: durationValue,
        }),
        chartSeries({
          label: 'Distress',
          records,
          unit: '0-5',
          value: distressValue,
        }),
      ],
      title: 'Duration and distress',
      type: 'line',
      xAxis: { labelMode: 'sparse' },
      yAxis: { decimals: 0, tickCount: 5 },
    },
    metrics: [
      {
        label: 'Latest duration',
        trend: 'up',
        unit: 'min',
        value: durationValue(latest),
      },
      {
        label: 'Latest distress',
        trend: 'down',
        unit: '0-5',
        value: distressValue(latest),
      },
      {
        label: 'Under threshold',
        value: `${underThreshold}/${records.length}`,
      },
      {
        label: 'Safe increases',
        unit: 'sessions',
        value: safeIncreaseCount(records),
      },
      { label: 'Regressions', unit: 'sessions', value: 0 },
    ],
    milestones: [],
    sourceRecordIds: records.map((record) => record.id),
    summary: `Early sessions reached ${durationValue(latest)} minutes with distress down to ${distressValue(latest)}.`,
  };
};

const durationEndpointsOutput = (
  records: openrouter.CardLlmRecord[]
): cardOutput.CardOutput => {
  const first = records[0];
  const latest = records.at(-1);

  if (!first || !latest) {
    throw new Error('Previous output records are required');
  }

  const endpoints = [first, latest];

  return {
    ...durationProgressOutput(endpoints),
    metrics: [
      {
        label: 'Latest duration',
        trend: 'up',
        unit: 'min',
        value: durationValue(latest),
      },
      {
        label: 'Latest distress',
        trend: 'down',
        unit: '0-5',
        value: distressValue(latest),
      },
      { label: 'Under threshold', value: '38/47' },
    ],
    summary: `Duration rose from ${durationValue(first)} to ${durationValue(latest)} minutes.`,
  };
};

const scenarioPreviousOutput = ({
  records,
  scenario,
}: {
  records: openrouter.CardLlmRecord[];
  scenario: EvalScenario | undefined;
}) => {
  if (scenario?.previousOutput) return scenario.previousOutput;

  if (scenario?.previousOutputKind === 'durationProgressStart') {
    return durationProgressOutput(
      records.slice(0, scenario.previousRecordCount ?? 10)
    );
  }

  if (scenario?.previousOutputKind === 'durationEndpoints') {
    return durationEndpointsOutput(records);
  }

  return undefined;
};

const main = async () => {
  const { fixturePath, mode, prompt, tweakPrompt } = readInput();
  const fixture = await readFixture(fixturePath);
  const env = process.env as unknown as CloudflareEnv;
  const scenario = fixture.scenarios?.[mode as Exclude<EvalMode, 'generate'>];

  const previousOutput = scenarioPreviousOutput({
    records: fixture.records,
    scenario,
  });

  const commonInput = {
    env,
    prompt,
    records: fixture.records,
    totalRecordCount: fixture.records.length,
  };

  const result =
    mode === 'generate'
      ? await openrouter.generateCardResult(commonInput)
      : mode === 'blueprint'
        ? await openrouter.generateCardResult({
            ...commonInput,
            blueprint: requiredBlueprint(scenario?.blueprint),
          })
        : mode === 'refresh'
          ? await openrouter.refreshCardResult({
              ...commonInput,
              previousOutput: requiredPreviousOutput(previousOutput, mode),
              previousTitle: scenario?.previousTitle,
            })
          : await openrouter.tweakCardResult({
              ...commonInput,
              previousOutput: requiredPreviousOutput(previousOutput, mode),
              previousTitle: scenario?.previousTitle,
              tweakPrompt: requiredTweakPrompt(tweakPrompt),
            });

  const validation = cardOutput.validateCardOutput(result.output);

  const updatedPrompt =
    'updatedPrompt' in result && typeof result.updatedPrompt === 'string'
      ? result.updatedPrompt
      : undefined;

  const generatedTitle =
    'title' in result && typeof result.title === 'string'
      ? result.title
      : undefined;

  const title =
    mode === 'refresh'
      ? (scenario?.previousTitle ?? titleFromPrompt(prompt))
      : (generatedTitle ?? titleFromPrompt(updatedPrompt ?? prompt));

  console.log(
    JSON.stringify({
      fixture: {
        name: fixture.name ?? fixturePath,
        recordCount: fixture.records.length,
      },
      mode,
      output: result.output,
      strictValidation: validation.success
        ? { success: true }
        : {
            issues: validation.error.issues.map((issue) => ({
              message: issue.message,
              path: issue.path.join('.'),
            })),
            success: false,
          },
      title,
      ...(updatedPrompt && { updatedPrompt }),
    })
  );
};

const requiredPreviousOutput = (
  previousOutput: cardOutput.CardOutput | undefined,
  mode: EvalMode
) => {
  if (!previousOutput) {
    throw new Error(`${mode} scenario previousOutput is required`);
  }

  return previousOutput;
};

const requiredBlueprint = (value?: CardBlueprint) => {
  if (!value) throw new Error('blueprint scenario blueprint is required');
  return value;
};

const requiredTweakPrompt = (value?: string) => {
  if (!value?.trim()) throw new Error('tweakPrompt is required');
  return value;
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
