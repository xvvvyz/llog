import Button from 'components/button';
import Empty from 'components/empty';
import { List, ListItem } from 'components/list';
import listObservations from 'utilities/list-observations';

const Page = async () => {
  const { data: observations } = await listObservations();
  if (!observations?.length) return <Empty>No observation types</Empty>;

  return (
    <List>
      {observations.map((observation) => (
        <ListItem key={observation.id}>
          <Button
            className="flex h-full w-3/4 items-center gap-6"
            variant="link"
          >
            <span className="truncate">{observation.name}</span>
          </Button>
          <Button
            colorScheme="transparent"
            href={`/observations/${observation.id}/edit`}
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
