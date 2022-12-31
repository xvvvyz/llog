import MetaTags from 'components/meta-tags';
import getSubject from './utilities/get-subject';

interface HeadProps {
  params: {
    subjectId: string;
  };
}

const Head = async ({ params: { subjectId } }: HeadProps) => {
  const { data: subject } = await getSubject(subjectId);
  const title = `${subject?.name ?? 'Subject'} - llog`;

  return (
    <>
      <title>{title}</title>
      <MetaTags />
    </>
  );
};

export default Head;
