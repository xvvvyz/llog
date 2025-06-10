import { api } from '@/utilities/ui/api';

export const deleteAvatar = async () => {
  await api('/me/avatar', { method: 'DELETE' });
};
