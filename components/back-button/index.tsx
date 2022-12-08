'use client';

import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';

const BackButton = () => {
  const router = useRouter();

  return (
    <button onClick={() => router.back()}>
      <ArrowLeftIcon className="relative -left-1 w-9 fill-fg-1 transition-colors" />
      <span className="sr-only">Back</span>
    </button>
  );
};

export default BackButton;
