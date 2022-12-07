'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import supabase from '/utilities/browser-supabase-client';

const SignOutButton = () => {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <button
      disabled={isSigningOut}
      onClick={async () => {
        setIsSigningOut(true);
        await supabase.auth.signOut();
        await router.refresh();
      }}
    >
      {isSigningOut ? <>Signing out&hellip;</> : <>Sign out</>}
    </button>
  );
};

export default SignOutButton;
