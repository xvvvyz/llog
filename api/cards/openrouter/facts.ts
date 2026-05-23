import * as cardAnalysis from '@/domain/cards/analysis';
import type { CardLlmRecord } from './types';
import { asArray, asRecord, cleanNullableObject } from './utils';

const emptyExtractedFacts = (
  recordId: string
): cardAnalysis.ExtractedRecordFacts => ({
  events: [],
  evidence: [],
  numericValues: [],
  outcomes: [],
  qualitativeLabels: [],
  recordId,
});

export const readExtractedFacts = ({
  analysisSpec,
  parsedJson,
  records,
}: {
  analysisSpec: cardAnalysis.CardAnalysisSpec;
  parsedJson: unknown;
  records: CardLlmRecord[];
}) => {
  const factsByRecordId = new Map<string, cardAnalysis.ExtractedRecordFacts>();
  const seenIndexes = new Set<number>();

  for (const item of asArray(asRecord(parsedJson).records)) {
    const row = asRecord(item);
    const recordIndex = Math.floor(Number(row.recordIndex));
    const record = records[recordIndex - 1];

    if (!Number.isInteger(recordIndex) || recordIndex < 1 || !record?.id) {
      throw new Error(
        'OpenRouter fact extraction returned invalid recordIndex'
      );
    }

    if (seenIndexes.has(recordIndex)) {
      throw new Error('OpenRouter fact extraction returned duplicate records');
    }

    seenIndexes.add(recordIndex);

    const fact = cardAnalysis.readExtractedRecordFacts(
      cleanNullableObject({ ...row, recordId: record.id }),
      analysisSpec
    );

    if (fact) factsByRecordId.set(record.id, fact);
  }

  return records.map((record, index) => {
    if (!seenIndexes.has(index + 1)) {
      throw new Error('OpenRouter fact extraction omitted records');
    }

    return factsByRecordId.get(record.id) ?? emptyExtractedFacts(record.id);
  });
};
