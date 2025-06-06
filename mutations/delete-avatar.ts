import { api } from '@/utilities/api';

export const deleteAvatar = async () => {
  await api('/me/avatar', { method: 'DELETE' });
};
