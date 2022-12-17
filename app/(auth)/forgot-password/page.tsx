import ForgotPasswordForm from '../../../components/forgot-password-form';
import Button from '/components/button';
import Card from '/components/card';

const Page = () => (
  <>
    <Card breakpoint="sm">
      <h1 className="text-2xl">Forgot your password?</h1>
      <p className="mt-3 text-fg-2">
        Enter the email address associated with your account and we will send
        you a link to change&nbsp;your&nbsp;password.
      </p>
      <ForgotPasswordForm />
    </Card>
    <Button className="underline" href="/sign-in" variant="link">
      Return to sign in
    </Button>
  </>
);

export default Page;
