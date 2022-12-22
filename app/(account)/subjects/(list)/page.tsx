import Avatar from 'components/avatar';
import Button from 'components/button';
import Empty from 'components/empty';
import { List, ListItem } from 'components/list';
import createServerSupabaseClient from 'utilities/create-server-supabase-client';

const Page = async () => {
  const supabase = createServerSupabaseClient();

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, image_uri, name')
    .order('updated_at', { ascending: false });

  if (!subjects?.length) {
    return <Empty>No subjects</Empty>;
  }

  return (
    <List>
      {subjects?.map((subject) => (
        <ListItem key={subject.id}>
          <Button
            className="flex w-3/4 items-center gap-6"
            href={`/subjects/${subject.id}`}
            variant="link"
          >
            <Avatar file={subject.image_uri} name={subject.name} />
            <span className="truncate">{subject.name}</span>
          </Button>
          <Button
            colorScheme="bg"
            href={`/subjects/${subject.id}/edit`}
            size="sm"
          >
            Edit
          </Button>
        </ListItem>
      ))}
    </List>
  );
};

export default Page;
