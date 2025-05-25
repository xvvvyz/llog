import { LogEditForm } from '@/components/log-edit-form';
import { LogTagForm } from '@/components/log-tag-form';
import * as AlertDialog from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import * as Menu from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { db } from '@/utilities/db';
import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Platform, View } from 'react-native';

import {
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Tags,
  Trash,
} from 'lucide-react-native';

interface LogDropdownMenuProps {
  headerHeight?: number;
  logId: string;
  logName: string;
  variant?: 'header' | 'list';
}

export function LogDropdownMenu({
  headerHeight = 0,
  logId,
  logName,
  variant = 'list',
}: LogDropdownMenuProps) {
  const IconComponent = variant === 'list' ? MoreHorizontal : MoreVertical;
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isTagFormOpen, setIsTagFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <Fragment>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button
            accessibilityHint="Opens a menu with more options"
            accessibilityLabel={`More options for ${logName}`}
            className="size-14"
            size="icon"
            variant="link"
          >
            {variant === 'list' ? (
              <View className="size-6 items-center justify-center rounded-full bg-white/15 group-active:bg-white/25 web:transition-colors web:group-hover:bg-white/25">
                <Icon
                  aria-hidden
                  className="text-white"
                  icon={IconComponent}
                  size={20}
                />
              </View>
            ) : (
              <Icon
                aria-hidden
                className="text-foreground"
                icon={IconComponent}
                size={20}
              />
            )}
          </Button>
        </Menu.Trigger>
        <Menu.Content
          align="end"
          className={cn(
            variant === 'list' && '-mt-1.5 mr-3',
            variant === 'header' && 'mr-4'
          )}
          style={
            variant === 'header'
              ? {
                  top: Platform.select({
                    android: headerHeight,
                    default: 0,
                    ios: headerHeight,
                  }),
                }
              : undefined
          }
        >
          <Menu.Item
            accessibilityHint="Opens the edit form for this log"
            accessibilityLabel={`Edit ${logName}`}
            onPress={() => setIsEditFormOpen(true)}
          >
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={Pencil}
              size={20}
            />
            <Text>Edit</Text>
          </Menu.Item>
          <Menu.Item
            accessibilityHint="Opens the tags management form"
            accessibilityLabel={`Manage tags for ${logName}`}
            onPress={() => setIsTagFormOpen(true)}
          >
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={Tags}
              size={20}
            />
            <Text>Tags</Text>
          </Menu.Item>
          <Menu.Item
            accessibilityHint="Opens the delete confirmation dialog"
            accessibilityLabel={`Delete ${logName}`}
            onPress={() => setIsDeleteDialogOpen(true)}
          >
            <Icon
              aria-hidden
              className="text-placeholder"
              icon={Trash}
              size={20}
            />
            <Text>Delete</Text>
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
      <LogEditForm
        logId={logId}
        onClose={() => setIsEditFormOpen(false)}
        open={isEditFormOpen}
      />
      <LogTagForm
        logId={logId}
        onClose={() => setIsTagFormOpen(false)}
        open={isTagFormOpen}
      />
      <AlertDialog.Root
        onClose={() => setIsDeleteDialogOpen(false)}
        open={isDeleteDialogOpen}
      >
        <AlertDialog.Title>Delete &ldquo;{logName}&rdquo;?</AlertDialog.Title>
        <AlertDialog.Description>
          This log and its entries will be deleted permanently. No second
          chances.
        </AlertDialog.Description>
        <AlertDialog.Footer>
          <Button
            onPress={() => setIsDeleteDialogOpen(false)}
            variant="secondary"
          >
            <Text>Cancel</Text>
          </Button>
          <Button
            onPress={() => {
              db.transact(db.tx.logs[logId].delete());
              router.dismissTo('/');
            }}
            variant="destructive"
          >
            <Text>Delete</Text>
          </Button>
        </AlertDialog.Footer>
      </AlertDialog.Root>
    </Fragment>
  );
}
