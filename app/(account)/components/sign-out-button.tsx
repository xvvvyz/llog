'use client';

import Button from 'components/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import supabase from 'utilities/browser-supabase-client';

const SignOutButton = () => {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Button
      className="w-28 shrink-0 justify-end text-fg-2"
      loading={isSigningOut}
      loadingText="Goodbye"
      onClick={async () => {
        setIsSigningOut(true);
        await supabase.auth.signOut();
        await router.refresh();
      }}
      variant="link"
    >
      Sign out
    </Button>
  );
};

export default SignOutButton;
