import { MoreVertical } from '@/components/icons/more-vertical';
import { Pencil } from '@/components/icons/pencil';
import { Trash } from '@/components/icons/trash';
import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { HeaderTitle } from '@/components/ui/header-title';
import { Text } from '@/components/ui/text';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { db } from '@/utilities/db';
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
            <Button
              className="size-12"
              size="icon"
              variant="link"
              wrapperClassName="web:mr-4"
            >
              <MoreVertical className="text-foreground" size={20} />
            </Button>
          </Menu.Trigger>
          <Menu.Content
            align="end"
            className="mr-4"
            style={{
              top: Platform.select({
                android: headerHeight,
                default: 0,
                ios: headerHeight,
              }),
            }}
          >
            <Link asChild href={`/${params.id}/edit`}>
              <Menu.Item>
                <Pencil className="text-placeholder" size={20} />
                <Text>Edit</Text>
              </Menu.Item>
            </Link>
            <Link asChild href={`/${params.id}/delete`}>
              <Menu.Item>
                <Trash className="text-placeholder" size={20} />
                <Text>Delete</Text>
              </Menu.Item>
            </Link>
          </Menu.Content>
        </Menu.Root>
      ),
      headerTitle: () => <HeaderTitle>{name}</HeaderTitle>,
    });
  }, [headerHeight, name, navigation, params.id]);

  if (!log) return null;

  return null;
}
