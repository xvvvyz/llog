import { api } from '@/lib/api';

export const deleteProfileImage = async () => {
  return api('/files/me/avatar', { method: 'DELETE' });
};
