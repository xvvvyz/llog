import Empty from '(components)/empty';
import { LinkList, ListItem } from '(components)/link-list';
import INPUT_LABELS from '(utilities)/constant-input-labels';
import listInputs from '(utilities)/list-inputs';

const Page = async () => {
  const { data: inputs } = await listInputs();
  if (!inputs?.length) return <Empty>No inputs</Empty>;

  return (
    <LinkList>
      {inputs.map((input) => (
        <ListItem
          href={`/inputs/${input.id}`}
          key={input.id}
          pill={INPUT_LABELS[input.type]}
          text={input.label}
        />
      ))}
    </LinkList>
  );
};

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inputs' };
export default Page;