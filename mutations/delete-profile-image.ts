import { api } from '@/utilities/api';

export const deleteProfileImage = async () => {
  return api('/files/me/avatar', { method: 'DELETE' });
};
