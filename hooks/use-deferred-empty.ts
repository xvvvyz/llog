import { useDelayedTrue } from '@/hooks/use-delayed-true';

export const useDeferredEmpty = ({
  delayMs = 150,
  isEmpty,
  isLoading,
  resetKey,
}: {
  delayMs?: number;
  isEmpty: boolean;
  isLoading: boolean;
  resetKey?: unknown;
}) => {
  const canShowEmpty = useDelayedTrue(isEmpty && !isLoading, {
    delayMs,
    resetKey,
  });

  return {
    showEmpty: isEmpty && canShowEmpty,
    showLoading: isLoading || (isEmpty && !canShowEmpty),
  };
};
