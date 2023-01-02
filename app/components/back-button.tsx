'use client';

import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import Button, { ButtonProps } from 'components/button';
import { useSearchParams } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

const BackButton = ({ className, href }: ButtonProps) => {
  const searchParams = useSearchParams();

  return (
    <Button href={searchParams.get('back') ?? href} variant="link">
      <ArrowLeftIcon className={twMerge('relative -left-1 w-9', className)} />
      <span className="sr-only">Back</span>
    </Button>
  );
};

export default BackButton;
