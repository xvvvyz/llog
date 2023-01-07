'use client';

import Button from 'components/button';
import useBackLink from 'utilities/use-back-link';

interface EditMissionLinkProps {
  missionId: string;
  subjectId: string;
}

const EditMissionLink = ({ missionId, subjectId }: EditMissionLinkProps) => (
  <Button
    className="underline"
    href={`/subjects/${subjectId}/missions/${missionId}/edit?back=${useBackLink()}`}
    variant="link"
  >
    Edit mission
  </Button>
);

export default EditMissionLink;
