import Button from '@/_components/button';
import SignUpForm from '@/_components/sign-up-form';

export const metadata = { title: 'Sign up' };

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const { next } = await searchParams;

  return (
    <>
      <div className="sm:rounded sm:border sm:border-alpha-1 sm:bg-bg-2 sm:p-8">
        <h1 className="mb-12 text-2xl">Create your account</h1>
        <SignUpForm next={next} />
      </div>
      <p className="flex gap-4">
        <span className="text-fg-4">Have an account?</span>
        <Button href={`/sign-in${next ? `?next=${next}` : ''}`} variant="link">
          Sign in
        </Button>
      </p>
    </>
  );
};

export default Page;
