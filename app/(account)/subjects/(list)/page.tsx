import Avatar from '/components/avatar';
import Button from '/components/button';
import Empty from '/components/empty';
import createServerSupabaseClient from '/utilities/create-server-supabase-client';
import formatObjectURL from '/utilities/format-object-url';

const Page = async () => {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from('subjects')
    .select('id, image_uri, name')
    .order('updated_at', { ascending: false });

  if (!data?.length) {
    return <Empty>No subjects</Empty>;
  }

  return (
    <main>
      <ul className="divide-y divide-alpha-fg-1 border-y border-alpha-fg-1">
        {data?.map((subject) => (
          <li
            className="flex items-center justify-between py-3"
            key={subject.id}
          >
            <Button
              className="flex w-3/4 items-center gap-6"
              href={`/subjects/${subject.id}`}
              variant="unstyled"
            >
              <Avatar
                name={subject.name}
                src={formatObjectURL(subject.image_uri)}
              />
              <h2 className="truncate">{subject.name}</h2>
            </Button>
            <div className="flex gap-6 text-fg-2">
              <Button
                colorScheme="alpha-fg"
                href={`/subjects/${subject.id}/edit`}
                size="sm"
              >
                Edit
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default Page;
