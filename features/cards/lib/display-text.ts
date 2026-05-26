const COMPARISON_OPERATOR_REPLACEMENTS = [
  [/<=/g, '≤'],
  [/>=/g, '≥'],
  [/!=/g, '≠'],
] as const;

export const formatComparisonOperators = (value: string) =>
  COMPARISON_OPERATOR_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value
  );
