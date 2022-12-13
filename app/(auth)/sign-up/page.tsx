import SignUpForm from '../../../components/sign-up-form';
import Button from '/components/button';
import Card from '/components/card';

const Page = () => (
  <>
    <Card breakpoint="sm">
      <h1 className="text-2xl font-bold">Create an account</h1>
      <SignUpForm />
    </Card>
    <p className="flex gap-6">
      <span className="text-fg-2">Have an account?</span>{' '}
      <Button href="/sign-in" variant="unstyled">
        Sign in
      </Button>
    </p>
  </>
);

export default Page;
