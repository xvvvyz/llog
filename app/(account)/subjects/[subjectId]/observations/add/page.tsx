import { ArrowRightIcon } from '@heroicons/react/24/solid';
import Button from 'components/button';
import Empty from 'components/empty';
import { List, ListItem } from 'components/list';
import firstIfArray from 'utilities/first-if-array';
import getSubjectObservations from 'utilities/get-subject-observations';
import EditSubjectLink from './components/edit-subject-link';

interface PageProps {
  params: {
    subjectId: string;
  };
}

const Page = async ({ params: { subjectId } }: PageProps) => {
  const { data: observations } = await getSubjectObservations(subjectId);

  if (!observations?.length) {
    return (
      <Empty>
        No observations enabled
        <EditSubjectLink subjectId={subjectId} />
      </Empty>
    );
  }

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
              <ArrowRightIcon className="relative -right-[0.1em] ml-auto w-6 shrink-0" />
            </Button>
          </ListItem>
        );
      })}
    </List>
  );
};

export default Page;
