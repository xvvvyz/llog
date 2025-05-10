import * as AlertModal from '@/components/alert-modal';
import { Button } from '@/components/button';
import * as Menu from '@/components/dropdown-menu';
import { MoreVertical } from '@/components/icons/more-vertical';
import { Trash } from '@/components/icons/trash';
import { Text } from '@/components/text';
import { db } from '@/utilities/db';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import * as React from 'react';

export default function Log() {
  const navigation = useNavigation();
  const searchParams = useLocalSearchParams();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const id = searchParams.id as string;

  const { data } = db.useQuery({
    logs: {
      records: {},
      $: { where: { id } },
    },
  });

  const handleDelete = React.useCallback(() => {
    db.transact(db.tx.logs[id].delete());
    router.back();
  }, [id]);

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: data?.logs?.[0]?.name ?? '',
      headerRight: () => (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button className="web:mr-2" variant="ghost" size="icon">
              <MoreVertical className="text-foreground" size={20} />
            </Button>
          </Menu.Trigger>
          <Menu.Content align="end" sideOffset={12}>
            <Menu.Item onPress={() => setIsDeleteDialogOpen(true)}>
              <Trash size={18} className="mr-2 text-muted-foreground" />
              <Text>Delete</Text>
            </Menu.Item>
          </Menu.Content>
        </Menu.Root>
      ),
    });
  }, [data, navigation, isDeleteDialogOpen]);

  return (
    <AlertModal.Root
      open={isDeleteDialogOpen}
      onOpenChange={setIsDeleteDialogOpen}
    >
      <AlertModal.Content>
        <AlertModal.Header>
          <AlertModal.Title>Are you sure?</AlertModal.Title>
          <AlertModal.Description>
            Any existing log entries will be deleted.{'\n'}This action cannot be
            undone.
          </AlertModal.Description>
        </AlertModal.Header>
        <AlertModal.Footer>
          <Button
            onPress={() => setIsDeleteDialogOpen(false)}
            variant="secondary"
          >
            <Text>Cancel</Text>
          </Button>
          <Button onPress={handleDelete} variant="destructive">
            <Text>Delete</Text>
          </Button>
        </AlertModal.Footer>
      </AlertModal.Content>
    </AlertModal.Root>
  );
}
