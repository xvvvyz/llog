import { MoreVertical } from '@/components/icons/more-vertical';
import { Pencil } from '@/components/icons/pencil';
import { Trash } from '@/components/icons/trash';
import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { HeaderTitle } from '@/components/ui/header-title';
import { Text } from '@/components/ui/text';
import { db } from '@/utilities/db';
import { useHeaderHeight } from '@react-navigation/elements';
import { Link, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function Index() {
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string }>();

  const { data } = db.useQuery({
    logs: {
      $: { where: { id: params.id } },
      entries: {},
    },
  });

  const log = data?.logs?.[0];
  const name = log?.name ?? '';

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button className="size-12" size="icon" variant="link">
              <MoreVertical className="text-foreground" size={20} />
            </Button>
          </Menu.Trigger>
          <Menu.Content
            align="end"
            className="mr-4 mt-2"
            style={{ top: Platform.OS === 'ios' ? headerHeight : 0 }}
          >
            <Link asChild href={`/${params.id}/edit`}>
              <Menu.Item>
                <Pencil className="mr-2 text-foreground" size={18} />
                <Text>Edit</Text>
              </Menu.Item>
            </Link>
            <Link asChild href={`/${params.id}/delete`}>
              <Menu.Item>
                <Trash className="mr-2 text-foreground" size={18} />
                <Text>Delete</Text>
              </Menu.Item>
            </Link>
          </Menu.Content>
        </Menu.Root>
      ),
      headerTitle: () => {
        return <HeaderTitle>{name}</HeaderTitle>;
      },
    });
  }, [headerHeight, name, navigation, params.id]);

  if (!log) return null;

  return null;
}
