'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Button, { ButtonProps } from '/components/button';
import supabase from '/utilities/browser-supabase-client';

const SignOutButton = (props: ButtonProps) => {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Button
      loading={isSigningOut}
      loadingText="Byeee…"
      onClick={async () => {
        setIsSigningOut(true);
        await supabase.auth.signOut();
        await router.refresh();
      }}
      variant="unstyled"
      {...props}
    >
      Sign out
    </Button>
  );
};

export default SignOutButton;
