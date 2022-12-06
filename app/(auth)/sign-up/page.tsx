import Link from 'next/link';
import SignUpForm from './components/sign-up-form';
import Card from '/components/card';

const SignUpPage = () => (
  <>
    <Card>
      <h1 className="text-2xl">Create an account</h1>
      <SignUpForm />
    </Card>
    <p className="text-fg-2">
      Have an account? <Link href="/sign-in">Sign in</Link>
    </p>
  </>
);

export default SignUpPage;
