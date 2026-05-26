import * as openrouter from '@/api/cards/openrouter';
import * as cardAnalysis from '@/domain/cards/analysis';
import type { CardBlueprint } from '@/domain/cards/blueprint';
import * as cardOutput from '@/domain/cards/output';
import * as sourceAssembly from '@/domain/cards/source-assembly';
import { readFile } from 'node:fs/promises';

type EvalMode =
  | 'blueprint'
  | 'exact'
  | 'generate'
  | 'planned'
  | 'refresh'
  | 'tweak';

type EvalScenario = {
  blueprint?: CardBlueprint;
  previousOutputKind?: 'durationEndpoints' | 'durationProgressStart';
  previousOutput?: cardOutput.CardOutput;
  previousRecordCount?: number;
  previousTitle?: string | null;
};

type EvalFixture = {
  exact?: {
    analysisSpec: cardAnalysis.CardAnalysisSpec;
    expected?: unknown;
    facts?: cardAnalysis.ExtractedRecordFacts[];
    generated?: {
      count: number;
      events?: { countPattern: number[]; fieldId: string; label: string }[];
      numericValues?: {
        fieldId: string;
        label: string;
        unit?: string;
        valuePattern: number[];
      }[];
      startDate: string;
      tagId: string;
      tagName: string;
    };
    generationTime?: string;
    tagIds?: string[];
  };
  generationTime?: string;
  name?: string;
  records: sourceAssembly.CardSourceAssemblyRecord[];
  scenarios?: Partial<
    Record<Exclude<EvalMode, 'generate' | 'planned'>, EvalScenario>
  >;
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
    mode !== 'exact' &&
    mode !== 'generate' &&
    mode !== 'planned' &&
    mode !== 'refresh' &&
    mode !== 'tweak'
  ) {
    throw new Error(
      'mode must be blueprint, exact, generate, planned, refresh, or tweak'
    );
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

const addDays = (value: string, days: number) => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

const generatedExactFixture = (fixture: EvalFixture) => {
  const exact = fixture.exact;
  const generated = exact?.generated;
  if (!generated) return;
  const records: sourceAssembly.CardSourceAssemblyRecord[] = [];
  const facts: cardAnalysis.ExtractedRecordFacts[] = [];

  for (let index = 0; index < generated.count; index += 1) {
    const id = `record-${index + 1}`;
    const date = addDays(generated.startDate, index);

    const events = (generated.events ?? [])
      .map((event) => ({
        count: event.countPattern[index % event.countPattern.length] ?? 0,
        fieldId: event.fieldId,
        label: event.label,
      }))
      .filter((event) => event.count > 0);

    const numericValues = (generated.numericValues ?? []).flatMap((field) => {
      const value = field.valuePattern[index % field.valuePattern.length];
      if (typeof value !== 'number' || !Number.isFinite(value)) return [];

      return [
        {
          fieldId: field.fieldId,
          label: field.label,
          ...(field.unit && { unit: field.unit }),
          value,
        },
      ];
    });

    records.push({
      date,
      id,
      tags: [{ id: generated.tagId, name: generated.tagName }],
      text:
        [
          ...events.map((event) => `${event.label}: ${event.count}`),
          ...numericValues.map((field) => `${field.label}: ${field.value}`),
        ].join('\n') || 'No target facts.',
    });

    facts.push({
      events,
      evidence: [],
      numericValues,
      outcomes: [],
      qualitativeLabels: [],
      recordId: id,
    });
  }

  return {
    ...fixture,
    exact: { ...exact, facts },
    records,
  } satisfies EvalFixture;
};

const readFixture = async (fixturePath: string): Promise<EvalFixture> => {
  const fixture = JSON.parse(
    await readFile(fixturePath, 'utf8')
  ) as EvalFixture;

  const generated = generatedExactFixture(fixture);
  if (generated) return generated;

  if (!Array.isArray(fixture.records) || fixture.records.length === 0) {
    throw new Error('Fixture records are required');
  }

  return fixture;
};

const sessionValue = (
  record: sourceAssembly.CardSourceAssemblyRecord,
  label: string
) => {
  const match = (record.text ?? '').match(
    new RegExp(`${label}:\\s*(\\d+(?:\\.\\d+)?)`)
  );

  if (!match) throw new Error(`Missing ${label} in ${record.id}`);
  return Number(match[1]);
};

const durationValue = (record: sourceAssembly.CardSourceAssemblyRecord) =>
  sessionValue(record, 'Alone duration \\(min\\)');

const distressValue = (record: sourceAssembly.CardSourceAssemblyRecord) =>
  sessionValue(record, 'Peak distress \\(0-5\\)');

const chartSeries = ({
  label,
  records,
  unit,
  value,
}: {
  label: string;
  records: sourceAssembly.CardSourceAssemblyRecord[];
  unit: string;
  value: (record: sourceAssembly.CardSourceAssemblyRecord) => number;
}) => ({
  data: records.map((record) => ({
    label: String(record.date),
    value: value(record),
  })),
  label,
  unit,
});

const safeIncreaseCount = (
  records: sourceAssembly.CardSourceAssemblyRecord[]
) =>
  records.slice(1).filter((record, index) => {
    const previous = records[index];

    return (
      durationValue(record) > durationValue(previous) &&
      distressValue(record) <= 2
    );
  }).length;

const durationProgressOutput = (
  records: sourceAssembly.CardSourceAssemblyRecord[]
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
    summary: `Early sessions reached ${durationValue(latest)} minutes with distress down to ${distressValue(latest)}.`,
  };
};

const durationEndpointsOutput = (
  records: sourceAssembly.CardSourceAssemblyRecord[]
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
  records: sourceAssembly.CardSourceAssemblyRecord[];
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

const recordsWithTagIds = <
  T extends { tags?: { id?: string; name?: string }[] },
>(
  records: T[]
) =>
  records.map((record) => ({
    ...record,
    tags: (record.tags ?? []).map((tag, index) => ({
      id: tag.id ?? tag.name ?? `tag-${index + 1}`,
      name: tag.name,
    })),
  }));

const selectedTagIds = <T extends { tags?: { id?: string }[] }>(
  records: T[]
) => [
  ...new Set(
    records.flatMap((record) =>
      (record.tags ?? [])
        .map((tag) => tag.id)
        .filter((id): id is string => !!id)
    )
  ),
];

const exactFactsForFixture = (fixture: EvalFixture) => {
  if (!fixture.exact) return;

  if (!fixture.exact.analysisSpec || !Array.isArray(fixture.exact.facts)) {
    throw new Error('Exact fixture requires analysisSpec and facts');
  }

  const records = sourceAssembly.assembleCardLlmRecords(
    recordsWithTagIds(fixture.records)
  );

  const generationTime = fixture.generationTime ?? fixture.exact.generationTime;

  return cardAnalysis.aggregateExtractedFacts({
    analysisSpec: fixture.exact.analysisSpec,
    facts: fixture.exact.facts.map((facts) => ({ facts })),
    generationTime,
    records,
    tagIds: fixture.exact.tagIds ?? selectedTagIds(records),
  });
};

const plannedCardResult = async ({
  enableExactPlan,
  env,
  generationTime,
  prompt,
  records,
}: {
  enableExactPlan: boolean;
  env: CloudflareEnv;
  generationTime?: string;
  prompt: string;
  records: openrouter.CardLlmRecord[];
}) => {
  const plannedRecords = recordsWithTagIds(records);

  if (!enableExactPlan) {
    // Keep broad planned evals on sampled generation. Fixtures with exact
    // expectations exercise planner -> extraction -> deterministic aggregate.
    return openrouter.generateCardResult({
      env,
      generationTime,
      prompt,
      records: plannedRecords,
      totalRecordCount: plannedRecords.length,
    });
  }

  const plan = await openrouter.planCardAnalysis({
    env,
    generationTime,
    prompt,
    records: plannedRecords,
    totalRecordCount: plannedRecords.length,
  });

  if (plan.mode !== 'exact' || !plan.analysisSpec) {
    return openrouter.generateCardResult({
      env,
      generationTime,
      prompt,
      records: plannedRecords,
      totalRecordCount: plannedRecords.length,
    });
  }

  const exactRecords = cardAnalysis.selectExactRecords(plannedRecords, {
    analysisSpec: plan.analysisSpec,
    generationTime,
  });

  const extractedFacts = await openrouter.extractRecordFacts({
    analysisSpec: plan.analysisSpec,
    env,
    records: exactRecords,
  });

  const exactFacts = cardAnalysis.aggregateExtractedFacts({
    analysisSpec: plan.analysisSpec,
    facts: extractedFacts.map((facts) => ({ facts })),
    generationTime,
    records: exactRecords,
    tagIds: selectedTagIds(exactRecords),
  });

  return openrouter.generateCardResult({
    analysisMode: 'exact',
    env,
    exactFacts,
    generationTime,
    prompt,
    records: exactRecords,
    totalRecordCount: exactRecords.length,
  });
};

const main = async () => {
  const { fixturePath, mode, prompt, tweakPrompt } = readInput();
  const fixture = await readFixture(fixturePath);
  const env = process.env as unknown as CloudflareEnv;

  const generationTime =
    fixture.generationTime ?? fixture.exact?.generationTime;

  const assembledRecords = sourceAssembly.assembleCardLlmRecords(
    recordsWithTagIds(fixture.records)
  );

  const scenario =
    mode === 'planned'
      ? undefined
      : fixture.scenarios?.[mode as Exclude<EvalMode, 'generate' | 'planned'>];

  const previousOutput = scenarioPreviousOutput({
    records: fixture.records,
    scenario,
  });

  const commonInput = {
    env,
    generationTime,
    prompt,
    records: assembledRecords,
    totalRecordCount: assembledRecords.length,
  };

  const exactContext = fixture.exact
    ? {
        facts: requiredExactFacts(exactFactsForFixture(fixture)),
        records: cardAnalysis.selectExactRecords(assembledRecords, {
          analysisSpec: fixture.exact.analysisSpec,
          generationTime,
        }),
      }
    : undefined;

  const exactCommonInput = exactContext
    ? {
        ...commonInput,
        analysisMode: 'exact' as const,
        exactFacts: exactContext.facts,
        records: exactContext.records,
        totalRecordCount: exactContext.records.length,
      }
    : commonInput;

  const result =
    mode === 'generate'
      ? await openrouter.generateCardResult(commonInput)
      : mode === 'exact'
        ? await openrouter.generateCardResult(exactCommonInput)
        : mode === 'planned'
          ? await plannedCardResult({
              enableExactPlan: !!fixture.exact,
              ...commonInput,
              generationTime,
            })
          : mode === 'blueprint'
            ? await openrouter.generateCardResult({
                ...commonInput,
                blueprint: requiredBlueprint(scenario?.blueprint),
              })
            : mode === 'refresh'
              ? await openrouter.refreshCardResult({
                  ...exactCommonInput,
                  previousOutput: requiredPreviousOutput(previousOutput, mode),
                  previousTitle: scenario?.previousTitle,
                })
              : await openrouter.tweakCardResult({
                  ...exactCommonInput,
                  previousOutput: requiredPreviousOutput(previousOutput, mode),
                  previousTitle: scenario?.previousTitle,
                  tweakPrompt: requiredTweakPrompt(tweakPrompt),
                });

  const validation = cardOutput.validateCardOutput(result.output);

  const generatedTitle =
    'title' in result && typeof result.title === 'string'
      ? result.title
      : undefined;

  const title =
    mode === 'refresh'
      ? (scenario?.previousTitle ?? titleFromPrompt(prompt))
      : (generatedTitle ?? titleFromPrompt(prompt));

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

const requiredExactFacts = (value?: cardAnalysis.ExactCardFacts) => {
  if (!value) throw new Error('exact mode requires fixture exact facts');
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
