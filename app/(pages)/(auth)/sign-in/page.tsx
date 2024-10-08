import Button from '@/_components/button';
import SignInForm from '@/_components/sign-in-form';

export const metadata = { title: 'Sign in' };

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const { next } = await searchParams;

  return (
    <>
      <div className="w-full sm:rounded sm:border sm:border-alpha-1 sm:bg-bg-2 sm:p-8">
        <h1 className="mb-12 text-2xl">Welcome back</h1>
        <SignInForm next={next} />
      </div>
      <p className="flex gap-4">
        <span className="text-fg-4">Don&rsquo;t have an account?</span>
        <Button href={`/sign-up${next ? `?next=${next}` : ''}`} variant="link">
          Sign up
        </Button>
      </p>
    </>
  );
};

export default Page;
