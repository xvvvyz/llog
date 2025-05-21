import { LogForm } from '@/components/log-form';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { db } from '@/utilities/db';
import { useLocalSearchParams } from 'expo-router';

export default function Edit() {
  const searchParams = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = db.useQuery({
    logs: {
      $: { where: { id: searchParams.id } },
    },
  });

  return (
    <BottomSheet isLoading={isLoading}>
      <LogForm log={data?.logs?.[0]} />
    </BottomSheet>
  );
}
