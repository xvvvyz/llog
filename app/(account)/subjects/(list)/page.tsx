import Link from 'next/link';
import Card from '/components/card';
import Empty from '/components/empty';
import createServerSupabaseClient from '/utilities/create-server-supabase-client';

const Page = async () => {
  const { data } = await createServerSupabaseClient()
    .from('subjects')
    .select('id, name')
    .order('updated_at', { ascending: false });

  if (!data?.length) {
    return <Empty>You haven&rsquo;t created any subjects&hellip;</Empty>;
  }

  return (
    <main>
      <ul className="flex flex-col gap-3">
        {data?.map((subject) => (
          <Card
            as="li"
            className="flex justify-between"
            key={subject.id}
            size="sm"
          >
            <h2 className="font-bold">{subject.name}</h2>
            <div className="flex gap-6">
              <Link href={`/subjects/${subject.id}/edit`}>Edit</Link>
              <Link href={`/subjects/${subject.id}`}>View</Link>
            </div>
          </Card>
        ))}
      </ul>
    </main>
  );
};

export default Page;
