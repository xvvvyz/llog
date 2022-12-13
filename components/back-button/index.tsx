'use client';

import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import Button from '/components/button';

const BackButton = () => {
  const router = useRouter();

  return (
    <Button onClick={() => router.back()} variant="unstyled">
      <ArrowLeftIcon className="relative -left-1 w-9 fill-fg-2 transition-colors" />
      <span className="sr-only">Back</span>
    </Button>
  );
};

export default BackButton;
