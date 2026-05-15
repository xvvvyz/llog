import { MagicCodeSignInForm } from '@/features/account/components/magic-code-sign-in-form';
import { getSafeRedirectHref } from '@/features/account/lib/auth-redirect';
import { db } from '@/lib/db';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

export default function SignIn() {
  const auth = db.useAuth();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const redirectHref = getSafeRedirectHref(params.redirect) ?? '/';
  if (auth.user) return <Redirect href={redirectHref} />;
  if (auth.isLoading) return <Loading />;

  return (
    <Page>
      <MagicCodeSignInForm
        onSignedIn={() => router.replace(redirectHref)}
        title="Let’s get you signed in"
      />
    </Page>
  );
}
