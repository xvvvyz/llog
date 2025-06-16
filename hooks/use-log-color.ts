import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLog } from '@/queries/use-log';
import { SPECTRUM } from '@/theme/spectrum';

export const useLogColor = ({ id }: { id?: string }) => {
  const log = useLog({ id });
  const colorScheme = useColorScheme();
  return SPECTRUM[colorScheme][log.color ?? 11];
};
