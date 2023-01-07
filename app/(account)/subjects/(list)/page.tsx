import Avatar from 'components/avatar';
import Button from 'components/button';
import Empty from 'components/empty';
import { List, ListItem } from 'components/list';
import listSubjects from 'utilities/list-subjects';

const Page = async () => {
  const { data: subjects } = await listSubjects();
  if (!subjects?.length) return <Empty>No subjects</Empty>;

  return (
    <List>
      {subjects.map((subject) => (
        <ListItem key={subject.id}>
          <Button
            className="flex h-full w-3/4 items-center gap-6"
            href={`/subjects/${subject.id}`}
            variant="link"
          >
            <Avatar file={subject.image_uri} name={subject.name} />
            <span className="truncate">{subject.name}</span>
          </Button>
          <Button
            colorScheme="transparent"
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
