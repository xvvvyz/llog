'use client';

import DirtyHtml from '@/_components/dirty-html';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useToggle } from '@uidotdev/usehooks';
import { twMerge } from 'tailwind-merge';

interface DisclosureProps {
  children: string;
  className?: string;
  disabled?: boolean;
}

const Disclosure = ({ children, className, disabled }: DisclosureProps) => {
  const [disclosure, toggleDisclosure] = useToggle(disabled);

  return (
    <div
      className={twMerge(
        'group relative -mb-8 -mt-9 max-h-24 overflow-hidden px-4 py-8 after:absolute after:bottom-0 after:left-0 after:right-0 after:top-0 after:bg-gradient-to-b after:from-transparent after:via-[hsla(40,5%,13%,0.75)] after:to-[hsl(40,5%,13%)] sm:px-8 print:max-h-none print:after:hidden',
        disclosure && 'max-h-none after:hidden',
        disabled && 'cursor-default',
        className,
      )}
      onClick={(e) => {
        if (!disabled && (e.target as HTMLElement).localName !== 'a') {
          toggleDisclosure();
        }
      }}
      role="button"
    >
      <DirtyHtml>{children}</DirtyHtml>
      {!disclosure && (
        <ChevronDownIcon className="absolute bottom-4 left-1/2 z-10 w-7 -translate-x-1/2 text-fg-3 transition-colors group-hover:text-fg-2" />
      )}
    </div>
  );
};

export default Disclosure;