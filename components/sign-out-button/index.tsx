'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Button from '/components/button';
import supabase from '/utilities/browser-supabase-client';

const SignOutButton = () => {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Button
      className="w-28 shrink-0 text-right text-fg-2"
      loading={isSigningOut}
      loadingText="See ya!"
      onClick={async () => {
        setIsSigningOut(true);
        await supabase.auth.signOut();
        await router.refresh();
      }}
      variant="unstyled"
    >
      Sign out
    </Button>
  );
};

export default SignOutButton;