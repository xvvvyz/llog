import { notFound } from 'next/navigation';
import createServerSupabaseClient from '/utilities/create-server-supabase-client';

interface PageProps {
  params: {
    id: string;
  };
}

const Page = async ({ params: { id } }: PageProps) => {
  const { data } = await createServerSupabaseClient()
    .from('subjects')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) return notFound();

  return (
    <main>
      <h1>{data.name}</h1>
    </main>
  );
};

export default Page;
