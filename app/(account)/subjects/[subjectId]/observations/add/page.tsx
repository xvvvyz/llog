import { ArrowRightIcon } from '@heroicons/react/24/solid';
import { List, ListItem } from 'components/list';
import createServerSupabaseClient from 'utilities/create-server-supabase-client';
import firstIfArray from 'utilities/first-if-array';
import Button from '../../../../../components/button';
import Empty from '../../../../../components/empty';

interface PageProps {
  params: {
    subjectId: string;
  };
}

const Page = async ({ params: { subjectId } }: PageProps) => {
  const { data: observations } = await createServerSupabaseClient()
    .from('subject_observations')
    .select('observation:observations(description, id, name)')
    .eq('subject_id', subjectId);

  if (!observations?.length) return <Empty>No observation types enabled</Empty>;

  return (
    <List>
      {observations.map((data) => {
        const observation = firstIfArray(data.observation);
        if (!observation) return null;

        return (
          <ListItem key={observation.id}>
            <Button
              className="mx-0 flex h-full w-full items-center gap-6 px-0"
              href={`/subjects/${subjectId}/observations/${observation.id}/add`}
              variant="link"
            >
              <span className="w-3/4 truncate">{observation.name}</span>
              <ArrowRightIcon className="relative -right-1 ml-auto w-6 shrink-0" />
            </Button>
          </ListItem>
        );
      })}
    </List>
  );
};

export default Page;
