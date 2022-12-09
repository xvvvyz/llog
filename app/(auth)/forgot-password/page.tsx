import Link from 'next/link';
import ForgotPasswordForm from '../../../components/forgot-password-form';
import Card from '/components/card';

const Page = () => (
  <>
    <Card breakpoint="xs">
      <h1 className="text-2xl font-bold">Forgot your password?</h1>
      <p className="mt-3 text-fg-2">
        Enter the email address associated with your account and we will send
        you a link to change&nbsp;your&nbsp;password.
      </p>
      <ForgotPasswordForm />
    </Card>
    <Link href="/sign-in">Return to sign in</Link>
  </>
);

export default Page;
