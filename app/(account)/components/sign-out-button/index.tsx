'use client';

import { useRouter } from 'next/navigation';
import supabase from '/utilities/browser-supabase-client';

const SignOutButton = () => {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
};

export default SignOutButton;
