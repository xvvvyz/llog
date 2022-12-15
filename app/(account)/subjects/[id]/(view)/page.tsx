import Image from 'next/image';
import { notFound } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import BackButton from '/components/back-button';
import Button from '/components/button';
import createServerSupabaseClient from '/utilities/create-server-supabase-client';
import formatObjectURL from '/utilities/format-object-url';

interface PageProps {
  params: {
    id: string;
  };
}

const Page = async ({ params: { id } }: PageProps) => {
  const { data } = await createServerSupabaseClient()
    .from('subjects')
    .select('id, image_uri, name')
    .eq('id', id)
    .single();

  if (!data) return notFound();
  const coverImage = formatObjectURL(data.image_uri);

  return (
    <header
      className={twMerge(
        'relative -mx-6 mt-10 overflow-hidden p-6 sm:rounded',
        !coverImage && 'border-y border-alpha-fg-2 bg-bg-2 sm:border-x'
      )}
    >
      {coverImage && (
        <>
          <div className="absolute left-0 top-0 -z-10 -z-10 h-full w-full bg-gradient-to-t from-alpha-bg-3" />
          <Image
            alt=""
            className="relative -z-20 object-cover object-center"
            fill
            sizes="512px"
            src={coverImage}
          />
        </>
      )}
      <div className={coverImage ? '' : '-m-[1px]'}>
        <div className="mb-12 mt-0 flex items-center justify-between">
          <BackButton className="fill-text-fg-1" />
          <Button
            colorScheme="alpha-bg"
            href={`/subjects/${id}/edit`}
            size="sm"
          >
            Edit
          </Button>
        </div>
        <h1 className="text-2xl font-bold">{data.name}</h1>
      </div>
    </header>
  );
};

export default Page;
