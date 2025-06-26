import { api } from '@/utilities/api';

export const deleteAvatar = async () => {
  return api('/files/me/avatar', { method: 'DELETE' });
};
