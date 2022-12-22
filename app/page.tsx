import Button from 'components/button';

const Page = () => (
  <main className="mx-auto flex min-h-full max-w-sm items-center justify-center gap-6 py-12 px-6">
    <Button href="/sign-in" variant="link">
      Sign in
    </Button>
    <Button href="/sign-up" variant="link">
      Sign up
    </Button>
  </main>
);

export default Page;
