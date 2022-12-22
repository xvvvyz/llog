import SignInForm from '(auth)/sign-in/components/sign-in-form';
import Button from 'components/button';
import Card from 'components/card';

const Page = () => (
  <>
    <Card breakpoint="sm">
      <h1 className="text-2xl">Welcome back</h1>
      <SignInForm />
    </Card>
    <p className="flex gap-6">
      <span className="text-fg-2">Don&rsquo;t have an account?</span>
      <Button className="underline" href="/sign-up" variant="link">
        Sign up
      </Button>
    </p>
  </>
);

export default Page;
