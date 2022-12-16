'use client';

import Image from 'next/image';
import { twMerge } from 'tailwind-merge';
import formatImageUrl from '/utilities/format-image-url';
import generateImageLoader from '/utilities/generate-image-loader';

const sizes = {
  md: '36px',
};

interface AvatarProps {
  file?: string | File | null;
  name: string;
  size?: keyof typeof sizes;
}

const Avatar = ({ file, name, size = 'md' }: AvatarProps) => {
  const src = formatImageUrl(file);

  return (
    <div
      className={twMerge(
        'relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-alpha-1 uppercase text-alpha-3',
        !src && 'border border-alpha-2'
      )}
    >
      {src ? (
        <Image
          alt={`${name} avatar`}
          className="object-cover object-center"
          fill
          loader={generateImageLoader({ aspectRatio: '1:1' })}
          sizes={sizes[size]}
          src={src}
        />
      ) : (
        <span aria-hidden>{name[0]}</span>
      )}
    </div>
  );
};

export default Avatar;
