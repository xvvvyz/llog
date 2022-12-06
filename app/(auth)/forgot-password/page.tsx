import Link from 'next/link';
import SendResetPasswordLinkForm from './components/send-reset-password-link-form';
import Card from '/components/card';

const ForgotPasswordPage = () => (
  <>
    <Card>
      <h1 className="text-2xl">Reset your password</h1>
      <p className="mt-3 pr-6 text-fg-2">
        Enter the email address associated with your account and we will send you a link to
        reset&nbsp;your&nbsp;password.
      </p>
      <SendResetPasswordLinkForm />
    </Card>
    <Link href="/sign-in">Return to sign in</Link>
  </>
);

export default ForgotPasswordPage;
