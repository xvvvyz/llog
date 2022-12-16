import { notFound } from 'next/navigation';
import Avatar from '/components/avatar';
import BackButton from '/components/back-button';
import Button from '/components/button';
import Card from '/components/card';
import Header from '/components/header';
import { List, ListItem } from '/components/list';
import createServerSupabaseClient from '/utilities/create-server-supabase-client';

interface PageProps {
  params: {
    id: string;
  };
}

const Page = async ({ params: { id } }: PageProps) => {
  const { data: subject } = await createServerSupabaseClient()
    .from('subjects')
    .select('id, image_uri, name')
    .eq('id', id)
    .single();

  if (!subject) return notFound();

  return (
    <>
      <Header>
        <BackButton href="/subjects" />
        <h1 className="w-1/2 truncate text-center text-2xl">{subject.name}</h1>
        <Avatar file={subject.image_uri} name={subject.name} />
      </Header>
      <main>
        <section>
          <Header>
            <h2 className="text-2xl">Missions</h2>
            <Button size="sm">Add mission</Button>
          </Header>
          <List>
            <ListItem>
              <Button className="w-3/4 truncate" variant="unstyled">
                Reduce separation anxiety
              </Button>
              <Button colorScheme="bg" size="sm">
                Edit
              </Button>
            </ListItem>
            <ListItem>
              <Button className="w-3/4 truncate" variant="unstyled">
                Learn to shake hands
              </Button>
              <Button colorScheme="bg" size="sm">
                Edit
              </Button>
            </ListItem>
          </List>
        </section>
        <section>
          <Header>
            <h2 className="text-2xl">Timeline</h2>
            <Button size="sm">Add observation</Button>
          </Header>
          <ul className="-mt-6 flex flex-col gap-3">
            <li className="flex flex-col gap-3">
              <div className="ml-6 flex h-16 items-end justify-end border-l-2 border-dashed border-alpha-2 text-fg-2">
                November 23, 2022
              </div>
              <Card size="sm">Item one</Card>
              <Card size="sm">Item two</Card>
            </li>
            <li className="flex flex-col gap-3">
              <div className="ml-6 flex h-16 items-end justify-end border-l-2 border-dashed border-alpha-2 text-fg-2">
                November 22, 2022
              </div>
              <Card size="sm">Item one</Card>
              <Card size="sm">Item two</Card>
              <Card size="sm">Item three</Card>
            </li>
          </ul>
        </section>
      </main>
    </>
  );
};

export default Page;
