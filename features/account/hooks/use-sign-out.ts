import * as push from '@/features/account/lib/web-push';
import { alert } from '@/lib/alert';
import { waitAtMost } from '@/lib/async';
import { db } from '@/lib/db';
import { router } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

const SIGN_OUT_PUSH_DETACH_TIMEOUT_MS = 1500;

export const useSignOut = () => {
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const signOut = React.useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      if (Platform.OS === 'web') {
        try {
          await waitAtMost(
            push.detachWebPushSubscription(),
            SIGN_OUT_PUSH_DETACH_TIMEOUT_MS
          );
        } catch (error) {
          console.error(
            'Failed to detach web push subscription during sign out',
            error
          );
        }
      }

      await db.auth.signOut();
      router.replace('/sign-in');
    } catch (error) {
      alert({
        message: error instanceof Error ? error.message : 'Failed to sign out.',
        title: 'Error',
      });

      setIsSigningOut(false);
    }
  }, [isSigningOut]);

  return { isSigningOut, signOut };
};
