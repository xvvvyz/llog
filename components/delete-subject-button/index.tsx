'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Button from '/components/button';
import supabase from '/utilities/browser-supabase-client';

interface DeleteSubjectButtonProps {
  id: string;
}

const DeleteSubjectButton = ({ id }: DeleteSubjectButtonProps) => {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isConfirming || isDeleting) {
    return (
      <Button
        className="text-red-1 hover:text-red-2"
        loading={isDeleting}
        loadingText="Deleting subject…"
        onClick={() => setIsConfirming(true)}
        variant="unstyled"
      >
        Delete subject
      </Button>
    );
  }

  return (
    <span className="inline-flex gap-3">
      Are you sure?
      <Button
        className="text-red-1 hover:text-red-2"
        onClick={async () => {
          setIsDeleting(true);
          await supabase.from('subjects').delete().eq('id', id);
          await router.replace('/subjects');
          await router.refresh();
        }}
        variant="unstyled"
      >
        Yes
      </Button>
      /
      <Button onClick={() => setIsConfirming(false)} variant="unstyled">
        No
      </Button>
    </span>
  );
};

export default DeleteSubjectButton;
