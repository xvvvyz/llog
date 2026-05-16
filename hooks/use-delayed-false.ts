import { useDelayedTrue } from '@/hooks/use-delayed-true';

export const useDelayedFalse = (
  value: boolean,
  { delayMs = 200, resetKey }: { delayMs?: number; resetKey?: unknown } = {}
) => !useDelayedTrue(!value, { delayMs, resetKey });
