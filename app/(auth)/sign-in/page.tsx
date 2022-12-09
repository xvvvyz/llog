import Link from 'next/link';
import SignInForm from '../../../components/sign-in-form';
import Card from '/components/card';

const Page = () => (
  <>
    <Card breakpoint="xs">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <SignInForm />
    </Card>
    <p>
      <span className="text-fg-2">Don&rsquo;t have an account?</span>{' '}
      <Link href="/sign-up">Sign up</Link>
    </p>
  </>
);

export default Page;
