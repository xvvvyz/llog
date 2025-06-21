import { api } from '@/utilities/ui/api';

export const deleteAvatar = async () => {
  return api('/me/avatar', { method: 'DELETE' });
};
