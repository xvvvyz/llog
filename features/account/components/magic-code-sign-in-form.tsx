import { AppLogoMark } from '@/features/account/components/app-logo-mark';
import { db } from '@/lib/db';
import { Button } from '@/ui/button';
import { Field } from '@/ui/field';
import { KeyboardAwareScreen } from '@/ui/keyboard-aware-screen';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View } from 'react-native';

const CODE_LENGTH = 6;
const CODE_INPUT_ID = 'sign-in-code';
const EMAIL_INPUT_ID = 'sign-in-email';
const KEYBOARD_BOTTOM_OFFSET = 120;
const RESEND_COOLDOWN_SECONDS = 30;
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

type MagicCodeSignInFormProps = {
  description?: string;
  onSignedIn?: () => void;
  title: string;
};

export const MagicCodeSignInForm = ({
  description = 'We’ll send a one-time code to your email.',
  onSignedIn,
  title,
}: MagicCodeSignInFormProps) => {
  const [code, setCode] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [isTransitioning, startTransition] = React.useTransition();
  const [resendAvailableAt, setResendAvailableAt] = React.useState(0);
  const [resendSeconds, setResendSeconds] = React.useState(0);
  const [step, setStep] = React.useState<'email' | 'code'>('email');
  const submittedCodeRef = React.useRef<string | null>(null);
  const normalizedEmail = normalizeEmail(email);
  const canSubmitEmail = isValidEmail(normalizedEmail) && !isTransitioning;
  const canSubmitCode = code.trim().length > 0 && !isTransitioning;
  const canResend = resendSeconds === 0 && !isTransitioning;

  React.useEffect(() => {
    if (!resendAvailableAt) {
      setResendSeconds(0);
      return;
    }

    const update = () => {
      setResendSeconds(
        Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000))
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [resendAvailableAt]);

  const startResendCooldown = React.useCallback(() => {
    setResendAvailableAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
  }, []);

  const sendCode = React.useCallback(
    (nextEmail: string) =>
      startTransition(async () => {
        if (!isValidEmail(nextEmail)) return;

        try {
          await db.auth.sendMagicCode({ email: nextEmail });
        } catch {
          // noop
          return;
        }

        setEmail(nextEmail);
        setCode('');
        submittedCodeRef.current = null;
        startResendCooldown();
        setStep('code');
      }),
    [startResendCooldown, startTransition]
  );

  const handleEmailSubmit = React.useCallback(() => {
    sendCode(normalizedEmail);
  }, [normalizedEmail, sendCode]);

  const handleResend = React.useCallback(() => {
    if (!canResend) return;
    sendCode(normalizedEmail);
  }, [canResend, normalizedEmail, sendCode]);

  const handleUseDifferentEmail = React.useCallback(() => {
    setCode('');
    submittedCodeRef.current = null;
    setStep('email');
  }, []);

  const handleCodeSubmit = React.useCallback(
    (nextCode = code) =>
      startTransition(async () => {
        const trimmedCode = nextCode.trim();
        if (!trimmedCode) return;

        try {
          await db.auth.signInWithMagicCode({
            code: trimmedCode,
            email: normalizedEmail,
          });
        } catch {
          submittedCodeRef.current = null;
          // noop
          return;
        }

        onSignedIn?.();
      }),
    [code, normalizedEmail, onSignedIn, startTransition]
  );

  React.useEffect(() => {
    const trimmedCode = code.trim();
    if (step !== 'code' || trimmedCode.length !== CODE_LENGTH) return;
    if (submittedCodeRef.current === trimmedCode) return;
    submittedCodeRef.current = trimmedCode;
    handleCodeSubmit(trimmedCode);
  }, [code, handleCodeSubmit, step]);

  const heading =
    step === 'code'
      ? {
          description: (
            <>
              Enter the code sent to{' '}
              <Text className="font-medium text-foreground">
                {normalizedEmail}
              </Text>
              .
            </>
          ),
          title: 'Check your email',
        }
      : { description, title };

  return (
    <KeyboardAwareScreen
      bottomOffset={KEYBOARD_BOTTOM_OFFSET}
      contentContainerClassName="pb-6"
    >
      <View className="flex-1 mx-auto max-w-sm w-full p-6 justify-center">
        <View className="mb-8 gap-1">
          <View className="mb-7">
            <AppLogoMark />
          </View>
          <Text className="font-semibold leading-tight text-2xl web:text-balance">
            {heading.title}
          </Text>
          <Text className="leading-tight text-muted-foreground web:text-balance">
            {heading.description}
          </Text>
        </View>

        {step === 'email' ? (
          <>
            <Field
              autoComplete="email"
              autoFocus
              id={EMAIL_INPUT_ID}
              keyboardType="email-address"
              label="Email address"
              onChangeText={setEmail}
              onSubmitEditing={handleEmailSubmit}
              placeholder="you@example.com"
              returnKeyType="next"
              value={email}
            />
            <Button
              className="w-full"
              disabled={!canSubmitEmail}
              onPress={handleEmailSubmit}
              wrapperClassName="mt-4"
            >
              {isTransitioning ? <Spinner /> : <Text>Sign in</Text>}
            </Button>
          </>
        ) : (
          <>
            <Field
              autoComplete="one-time-code"
              id={CODE_INPUT_ID}
              keyboardType="number-pad"
              label="Code"
              labelRowClassName="pr-2"
              maxLength={CODE_LENGTH}
              onChangeText={setCode}
              onSubmitEditing={() => handleCodeSubmit()}
              placeholder="123456"
              returnKeyType="done"
              textContentType="oneTimeCode"
              value={code}
              rightLabelAccessory={
                <Button
                  disabled={!canResend}
                  onPress={handleResend}
                  size="xs"
                  variant="link"
                >
                  <Text>
                    {resendSeconds > 0
                      ? `Resend in ${resendSeconds}s`
                      : 'Resend code'}
                  </Text>
                </Button>
              }
            />
            <Button
              className="w-full"
              disabled={!canSubmitCode}
              onPress={() => handleCodeSubmit()}
              wrapperClassName="mt-4"
            >
              {isTransitioning ? <Spinner /> : <Text>Confirm</Text>}
            </Button>
            <View className="flex-row flex-wrap mt-10 gap-x-5 gap-y-3 justify-center">
              <Button
                onPress={handleUseDifferentEmail}
                size="xs"
                variant="link"
              >
                <Text>Use a different email</Text>
              </Button>
            </View>
          </>
        )}
      </View>
    </KeyboardAwareScreen>
  );
};
