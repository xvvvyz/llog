import Image from 'next/image';

interface AvatarProps {
  name: string;
  src?: string;
}

const Avatar = ({ name, src }: AvatarProps) => (
  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-alpha-1 uppercase text-alpha-3">
    {src ? (
      <Image
        alt={`${name} avatar`}
        className="object-cover object-center"
        fill
        sizes="33.75px"
        src={src}
      />
    ) : (
      name[0]
    )}
  </div>
);

export default Avatar;
