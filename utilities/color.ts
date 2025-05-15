export const lightness = (hsl: string, amount: number): string => {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hsl;
  const [, h, s, l] = match;
  return `hsl(${h}, ${s}%, ${Math.max(0, Math.min(100, parseInt(l) + amount))}%)`;
};
