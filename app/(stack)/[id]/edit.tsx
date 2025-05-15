import { LogForm } from '@/components/log-form';
import { Modal } from '@/components/ui/modal';
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
    <Modal isLoading={isLoading}>
      <LogForm log={data?.logs?.[0]} />
    </Modal>
  );
}
