import Button from 'components/button';
import Empty from 'components/empty';
import { List, ListItem } from 'components/list';
import listInputs from 'utilities/list-inputs';

const Page = async () => {
  const { data: inputs } = await listInputs();
  if (!inputs?.length) return <Empty>No inputs</Empty>;

  return (
    <List>
      {inputs.map((input) => (
        <ListItem key={input.id}>
          <Button
            className="flex h-full w-3/4 items-center gap-6"
            variant="link"
          >
            <span className="truncate">{input.label}</span>
          </Button>
          <Button
            colorScheme="transparent"
            href={`/inputs/${input.id}/edit`}
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
