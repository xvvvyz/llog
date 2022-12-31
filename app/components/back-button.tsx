import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import Button, { ButtonProps } from 'components/button';
import { twMerge } from 'tailwind-merge';

const BackButton = ({ className, href }: ButtonProps) => (
  <Button href={href} variant="link">
    <ArrowLeftIcon className={twMerge('relative -left-1 w-9', className)} />
    <span className="sr-only">Back</span>
  </Button>
);

export default BackButton;
