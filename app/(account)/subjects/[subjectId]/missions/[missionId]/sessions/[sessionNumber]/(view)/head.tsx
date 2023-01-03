import MetaTags from 'components/meta-tags';
import getSubject from '../../../../../utilities/get-subject';
import getMission from './utilities/get-mission';

interface HeadProps {
  params: {
    missionId: string;
    sessionNumber: string;
    subjectId: string;
  };
}

const Head = async ({
  params: { missionId, sessionNumber, subjectId },
}: HeadProps) => {
  const { data: subject } = await getSubject(subjectId);
  const { data: mission } = await getMission(missionId);
  if (!subject || !mission) return null;
  const title = `${subject.name} / ${mission.name} / Session ${sessionNumber} - llog`;

  return (
    <>
      <title>{title}</title>
      <MetaTags />
    </>
  );
};

export default Head;
