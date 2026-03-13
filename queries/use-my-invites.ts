import { api } from '@/utilities/api';
import { db } from '@/utilities/db';
import { useCallback, useEffect, useState } from 'react';

type Invite = {
  id: string;
  email: string;
  role: string;
  team?: { id: string; name: string };
};

export const useMyInvites = () => {
  const auth = db.useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    const res = await api('/teams/my-invites');

    if (res?.ok) {
      const data = await res.json();
      setInvites(data.invites ?? []);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (auth.user) {
      fetchInvites();
    } else if (!auth.isLoading) {
      setIsLoading(false);
    }
  }, [auth.user?.id, auth.isLoading, fetchInvites]);

  return { invites, isLoading, refetch: fetchInvites };
};
