import Link from 'next/link';
import SignInForm from './components/sign-in-form';
import Card from '/components/card';

const SignInPage = () => (
  <>
    <Card>
      <h1 className="text-2xl">Sign in to your account</h1>
      <SignInForm />
    </Card>
    <p className="text-fg-2">
      Don&rsquo;t have an account? <Link href="/sign-up">Sign up</Link>
    </p>
  </>
);

export default SignInPage;
