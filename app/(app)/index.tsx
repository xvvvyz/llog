import { Container } from '@/components/container';
import { Loading } from '@/components/loading';
import { Text } from '@/components/ui/text';
import { useAuthenticatedUser } from '@/lib/useAuthenticatedUser';
import { db } from '@/lib/utils';

export default function HomeView() {
  const user = useAuthenticatedUser();

  const { data, isLoading } = db.useQuery({
    profiles: {
      $: { where: { 'user.id': user.id } },
    },
    teams: {
      $: { where: { 'ui.user.id': user.id } },
    },
  });

  if (isLoading) return <Loading />;

  return (
    <Container>
      <Text className="text-center text-2xl font-bold">
        Welcome, {data?.profiles?.[0]?.name}!
      </Text>
      <Text className="text-center">Team: {data?.teams?.[0]?.name}</Text>
    </Container>
  );
}
