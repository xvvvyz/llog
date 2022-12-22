import { twMerge } from 'tailwind-merge';

interface SpinnerProps {
  className?: string;
}

const Spinner = ({ className }: SpinnerProps) => (
  <div
    className={twMerge(
      'h-4 w-4 animate-spin rounded-full border-2 border-fg-2 border-l-transparent',
      className
    )}
  />
);

export default Spinner;
