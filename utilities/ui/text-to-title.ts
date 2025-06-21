export const textToTitle = (text?: string): string => {
  if (!text) return '';

  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((s) => s.trim().length > 0);

  let title = sentences[0]?.trim() || '';
  if (title.length > 32) return title.slice(0, 31) + '…';
  return title;
};
