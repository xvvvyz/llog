import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

interface AvatarProps {
  name: string;
  src?: string;
}

const Avatar = ({ name, src }: AvatarProps) => (
  <div
    className={twMerge(
      'relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-alpha-fg-1 text-lg uppercase text-alpha-fg-3',
      !src && 'border border-alpha-fg-2'
    )}
  >
    {src ? (
      <Image
        alt={`${name} avatar`}
        className="object-cover object-center"
        fill
        sizes="72px"
        src={src}
      />
    ) : (
      name[0]
    )}
  </div>
);

export default Avatar;
