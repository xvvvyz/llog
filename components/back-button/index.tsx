'use client';

import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import Button, { ButtonProps } from '/components/button';

const BackButton = ({ className }: ButtonProps) => {
  const router = useRouter();

  return (
    <Button onClick={() => router.back()} variant="unstyled">
      <ArrowLeftIcon
        className={twMerge(
          'relative -left-1 w-9 fill-fg-2 transition-colors',
          className
        )}
      />
      <span className="sr-only">Back</span>
    </Button>
  );
};

export default BackButton;