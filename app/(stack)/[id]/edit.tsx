import { LogForm } from '@/components/log-form';
import { Modal } from '@/components/modal';
import { db } from '@/utilities/db';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

export default function Edit() {
  const searchParams = useLocalSearchParams<{ id: string }>();

  const { data } = db.useQuery({
    logs: {
      $: { where: { id: searchParams.id } },
    },
  });

  const log = data?.logs?.[0];
  if (!log) return <Redirect href="/" />;

  return (
    <Modal onClose={router.back}>
      <LogForm log={log} />
    </Modal>
  );
}
