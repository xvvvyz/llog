'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import supabase from '/utilities/browser-supabase-client';

const AuthListener = ({ accessToken }: { accessToken?: string }) => {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token !== accessToken) router.refresh();
    });
  }, [accessToken]);

  return null;
};

export default AuthListener;
