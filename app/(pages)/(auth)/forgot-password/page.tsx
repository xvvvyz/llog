import Button from '@/_components/button';
import ForgotPasswordForm from '@/_components/forgot-password-form';

export const metadata = { title: 'Forgot password' };

const Page = () => (
  <>
    <div className="sm:rounded sm:border sm:border-alpha-1 sm:bg-bg-2 sm:p-8">
      <h1 className="text-2xl">Forgot your password?</h1>
      <p className="mb-12 mt-3 text-fg-4">
        Enter the email address associated with your account and we will send
        you a link to change&nbsp;your&nbsp;password.
      </p>
      <ForgotPasswordForm />
    </div>
    <Button href="/sign-in" variant="link">
      Return to sign in
    </Button>
  </>
);

export default Page;
