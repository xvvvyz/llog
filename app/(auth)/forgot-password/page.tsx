import Link from 'next/link';
import SendChangePasswordLinkForm from './components/send-change-password-link-form';
import Card from '/components/card';

const ForgotPasswordPage = () => (
  <>
    <Card>
      <h1 className="text-2xl">Forgot your password?</h1>
      <p className="mt-3 pr-4 text-fg-2">
        Enter the email address associated with your account and we will send you a link to
        change&nbsp;your&nbsp;password.
      </p>
      <SendChangePasswordLinkForm />
    </Card>
    <Link href="/sign-in">Return to sign in</Link>
  </>
);

export default ForgotPasswordPage;
