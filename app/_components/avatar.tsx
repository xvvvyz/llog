'use client';

import formatImageUrl from '@/_utilities/format-image-url';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

const sizes = {
  md: { className: 'h-8 w-8', imgSizes: '32px' },
  sm: { className: 'h-6 w-6 text-sm', imgSizes: '24px' },
  xs: { className: 'h-5 w-5 text-xs', imgSizes: '20px' },
};

interface AvatarProps {
  className?: string;
  file?: string | File | null;
  id?: string;
  size?: keyof typeof sizes;
}

const Avatar = ({ className, file, id = '', size = 'md' }: AvatarProps) => {
  const src = formatImageUrl(file);

  return (
    <div
      className={twMerge(
        'relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-sm bg-alpha-2 uppercase tracking-tighter text-fg-4 shadow-sm',
        sizes[size].className,
        className,
      )}
    >
      {(file || id) && (
        <Image
          alt=""
          className="object-cover object-center"
          fill
          sizes={sizes[size].imgSizes}
          src={
            src ??
            `https://api.dicebear.com/7.x/shapes/png?seed=${id}&backgroundColor=ffdfbf,f88c49,c0aede,d1d4f9,f1f4dc,ffd5dc,0a5b83,1c799f,69d2e7,b6e3f4&backgroundType=solid&shape1=ellipseFilled,polygonFilled,rectangleFilled,line,polygon,rectangle,ellipse&shape2[]&shape2Color=f1f4dc,f88c49,0a5b83,1c799f,69d2e7,transparent&shape3[]`
          }
        />
      )}
    </div>
  );
};

export default Avatar;
