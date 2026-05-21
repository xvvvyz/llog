import * as cardOutput from '@/domain/cards/output';

export const CARD_TITLE_MAX_LENGTH = 80;

export const fallbackCardTitle = (prompt: string) => {
  const firstLine = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return (
    cardOutput.normalizeCardDisplayLabel({
      defaultValue: 'Progress card',
      maxLength: CARD_TITLE_MAX_LENGTH,
      value: firstLine ?? prompt,
    }) ?? 'Progress card'
  );
};
