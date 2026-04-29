import { OAuthLogoPair } from '@/features/account/components/oauth-logo-pair';
import { useOAuthAuthorization } from '@/features/account/hooks/use-oauth-authorization';
import { UI } from '@/theme/ui';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
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

  if (!auth.user) {
    return (
      <Page className="mx-auto max-w-sm w-full p-6 justify-center">
        {step === 'email' ? (
          <>
            <Label>Email address</Label>
            <Input
              autoComplete="email"
              autoFocus
              keyboardType="email-address"
              onChangeText={setEmail}
              onSubmitEditing={handleEmailSubmit}
              placeholder="jane@acme.com"
              returnKeyType="next"
              value={email}
            />
            <Button
              className="w-full"
              disabled={isPending}
              onPress={handleEmailSubmit}
              wrapperClassName="mt-6"
            >
              {isPending ? (
                <Spinner color={UI.light.contrastForeground} />
              ) : (
                <Text>Sign in</Text>
              )}
            </Button>
          </>
        ) : (
          <>
            <Label>
              Enter the code sent to{' '}
              <Text className="font-medium">{email}</Text>
            </Label>
            <Input
              keyboardType="number-pad"
              onChangeText={setCode}
              onSubmitEditing={handleCodeSubmit}
              placeholder="123456"
              value={code}
            />
            <Button
              className="w-full"
              disabled={isPending}
              onPress={handleCodeSubmit}
              wrapperClassName="mt-6"
            >
              {isPending ? (
                <Spinner color={UI.light.contrastForeground} />
              ) : (
                <Text>Confirm</Text>
              )}
            </Button>
          </>
        )}
      </Page>
    );
  }

  const clientName =
    preview.client?.clientName ?? preview.client?.clientUri ?? 'MCP client';

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
              <Spinner color={UI.light.contrastForeground} />
              <Text>Authorizing...</Text>
            </>
          ) : (
            <Text>Authorize</Text>
          )}
        </Button>
      </View>
    </Page>
  );
}
