'use client';

import Button from 'components/button';
import useBackLink from 'utilities/use-back-link';

interface EditSubjectLinkProps {
  subjectId: string;
}

const EditSubjectLink = ({ subjectId }: EditSubjectLinkProps) => (
  <Button
    className="underline"
    href={`/subjects/${subjectId}/edit?back=${useBackLink()}`}
    variant="link"
  >
    Edit subject
  </Button>
);

export default EditSubjectLink;
