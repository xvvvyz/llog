import { alert } from '@/lib/alert';
import { apiOrThrow } from '@/lib/api';
import { db } from '@/lib/db';
import * as React from 'react';
import { Platform } from 'react-native';

export type OAuthAuthorizePreview = {
  client: {
    clientId: string;
    clientName?: string;
    clientUri?: string;
    logoUri?: string;
  } | null;
  request: { clientId: string; redirectUri: string; scope: string[] };
};

const INVALID_AUTHORIZATION_REQUEST = 'Invalid authorization request.';

const getQuery = () =>
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.search.slice(1)
    : '';

export const useOAuthAuthorization = () => {
  const [code, setCode] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string>();
  const [isAuthorizing, setIsAuthorizing] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const [preview, setPreview] = React.useState<OAuthAuthorizePreview | null>(
    null
  );

  const [step, setStep] = React.useState<'email' | 'code'>('email');
  const auth = db.useAuth();
  const query = React.useMemo(getQuery, []);

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (!query) throw new Error(INVALID_AUTHORIZATION_REQUEST);

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/oauth/authorize/preview?${query}`
        );

        if (!response.ok) throw new Error(INVALID_AUTHORIZATION_REQUEST);
        const data = (await response.json()) as OAuthAuthorizePreview;
        if (!cancelled) setPreview(data);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : INVALID_AUTHORIZATION_REQUEST;

        if (!cancelled) setErrorMessage(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const handleAuthorize = React.useCallback(() => {
    if (isAuthorizing) return;
    setIsAuthorizing(true);

    startTransition(async () => {
      try {
        const response = await apiOrThrow(
          '/oauth/authorize/complete',
          {
            body: JSON.stringify({ query }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          },
          'Failed to authorize client'
        );

        const { redirectTo } = (await response.json()) as {
          redirectTo: string;
        };

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.assign(redirectTo);
          return;
        }

        setIsAuthorizing(false);
      } catch (error) {
        setIsAuthorizing(false);

        alert({
          message:
            error instanceof Error
              ? error.message
              : 'Failed to authorize client',
          title: 'Error',
        });
      }
    });
  }, [isAuthorizing, query, startTransition]);

  const handleEmailSubmit = React.useCallback(
    () =>
      startTransition(async () => {
        if (!email) return;

        try {
          await db.auth.sendMagicCode({ email });
        } catch {
          alert({ message: 'Invalid email', title: 'Error' });
          return;
        }

        setStep('code');
      }),
    [email, startTransition]
  );

  const handleCodeSubmit = React.useCallback(
    () =>
      startTransition(async () => {
        if (!code) return;

        try {
          await db.auth.signInWithMagicCode({ code: code.trim(), email });
        } catch {
          alert({ message: 'Invalid code', title: 'Error' });
        }
      }),
    [code, email, startTransition]
  );

  return {
    auth,
    code,
    email,
    errorMessage,
    handleAuthorize,
    handleCodeSubmit,
    handleEmailSubmit,
    isAuthorizing,
    isPending,
    preview,
    setCode,
    setEmail,
    step,
  };
};
