import { LogForm } from '@/components/log-form';
import { Modal } from '@/components/modal';
import { router } from 'expo-router';

export default function New() {
  return (
    <Modal onClose={router.back}>
      <LogForm />
    </Modal>
  );
}
