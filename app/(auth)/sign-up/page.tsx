import Link from 'next/link';
import SignUpForm from '../../../components/sign-up-form';
import Card from '/components/card';

const Page = () => (
  <>
    <Card breakpoint="xs">
      <h1>Create an account</h1>
      <SignUpForm />
    </Card>
    <p>
      <span className="text-fg-2">Have an account?</span>{' '}
      <Link href="/sign-in">Sign in</Link>
    </p>
  </>
);

export default Page;
