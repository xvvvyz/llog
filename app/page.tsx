import Link from 'next/link';

const LandingPage = () => (
  <main className="mx-auto flex min-h-full max-w-sm items-center justify-center gap-6 py-12 px-6">
    <Link href="/sign-in">Sign in</Link>
    <Link href="/sign-up">Sign up</Link>
  </main>
);

export default LandingPage;
