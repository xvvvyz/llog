import { HeaderTitle } from '@/components/header-title';
import { MoreVertical } from '@/components/icons/more-vertical';
import { Pencil } from '@/components/icons/pencil';
import { Trash } from '@/components/icons/trash';
import { LogForm } from '@/components/log-form';
import * as AlertModal from '@/components/ui/alert-modal';
import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { SheetModal } from '@/components/ui/sheet-modal';
import { Text } from '@/components/ui/text';
import { db } from '@/utilities/db';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import * as React from 'react';

export default function Log() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false);
  const navigation = useNavigation();
  const searchParams = useLocalSearchParams();

  const id = searchParams.id as string;

  const { data } = db.useQuery({
    logs: {
      records: {},
      $: { where: { id } },
    },
  });

  const handleDelete = React.useCallback(() => {
    db.transact(db.tx.logs[id].delete());
    setIsDeleteDialogOpen(false);
    router.back();
  }, [id]);

  React.useEffect(() => {
    const title = data?.logs?.[0]?.name ?? '';

    navigation.setOptions({
      headerBackButtonDisplayMode: 'minimal',
      headerTitle: () => <HeaderTitle>{title}</HeaderTitle>,
      headerRight: () => (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button className="web:mr-2" variant="ghost" size="icon">
              <MoreVertical className="text-foreground" size={20} />
            </Button>
          </Menu.Trigger>
          <Menu.Content align="end" sideOffset={12}>
            <Menu.Item onPress={() => setIsEditSheetOpen(true)}>
              <Pencil className="mr-2 text-muted-foreground" size={18} />
              <Text>Edit</Text>
            </Menu.Item>
            <Menu.Item onPress={() => setIsDeleteDialogOpen(true)}>
              <Trash className="mr-2 text-muted-foreground" size={18} />
              <Text>Delete</Text>
            </Menu.Item>
          </Menu.Content>
        </Menu.Root>
      ),
    });
  }, [data, navigation]);

  return (
    <>
      <SheetModal open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <LogForm
          log={data?.logs?.[0]}
          onSuccess={() => setIsEditSheetOpen(false)}
        />
      </SheetModal>
      <AlertModal.Root
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertModal.Content>
          <AlertModal.Header>
            <AlertModal.Title>Are you sure?</AlertModal.Title>
            <AlertModal.Description>
              Any existing log entries will be deleted.
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
    </>
  );
}
