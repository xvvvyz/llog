import { MagicCodeSignInForm } from '@/features/account/components/magic-code-sign-in-form';
import { OAuthLogoPair } from '@/features/account/components/oauth-logo-pair';
import { useOAuthAuthorization } from '@/features/account/hooks/use-oauth-authorization';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Loading } from '@/ui/loading';
import { Page } from '@/ui/page';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { router } from 'expo-router';
import { ArrowRight, WarningCircle } from 'phosphor-react-native';
import { View } from 'react-native';

export default function Authorize() {
  const {
    auth,
    errorMessage,
    handleAuthorize,
    isAuthorizing,
    isPending,
    preview,
  } = useOAuthAuthorization();

  if (auth.isLoading || (!preview && !errorMessage)) return <Loading />;

  if (errorMessage) {
    return (
      <Page className="p-6 items-center justify-center">
        <View className="flex-1 px-3 py-8 gap-8 items-center justify-center">
          <Icon className="text-destructive" icon={WarningCircle} size={64} />
          <Text className="mt-2 text-center text-muted-foreground">
            {errorMessage}
          </Text>
          <Button
            onPress={() => router.replace('/')}
            variant="secondary"
            wrapperClassName="mt-4"
          >
            <Text>Oh well</Text>
            <Icon className="-mr-0.5" icon={ArrowRight} />
          </Button>
        </View>
      </Page>
    );
  }

  if (!preview) return <Loading />;

  const clientName =
    preview.client?.clientName ?? preview.client?.clientUri ?? 'MCP client';

  if (!auth.user) {
    return (
      <Page>
        <MagicCodeSignInForm
          description={`Sign in before connecting llog to ${clientName}.`}
          title={`Sign in to authorize ${clientName}`}
        />
      </Page>
    );
  }

  return (
    <Page className="p-6 items-center justify-center">
      <View className="flex-1 px-3 py-8 gap-8 items-center justify-center">
        <OAuthLogoPair clientName={clientName} />
        <Text className="mt-2 max-w-xs text-center text-muted-foreground">
          Connect <Text className="font-medium text-foreground">llog</Text> to{' '}
          <Text className="font-medium text-foreground">{clientName}</Text>.
          This allows the app to access llog through MCP.
        </Text>
        <Button
          disabled={isAuthorizing || isPending}
          onPress={handleAuthorize}
          wrapperClassName="mt-4"
        >
          {isAuthorizing || isPending ? (
            <>
              <Spinner />
              <Text>Authorizing…</Text>
            </>
          ) : (
            <Text>Authorize</Text>
          )}
        </Button>
      </View>
    </Page>
  );
}
