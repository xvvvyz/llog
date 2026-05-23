import { Button, type ButtonProps } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { PressPropagationBoundary } from '@/ui/press-propagation-boundary';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { cn } from '@/lib/cn';
import * as React from 'react';
import { View } from 'react-native';

import {
  ArrowClockwise,
  DotsThreeVertical,
  ListNumbers,
  MagicWand,
  NotePencil,
  StackSimple,
  Trash,
} from 'phosphor-react-native';

export const CardGeneratingIndicator = ({
  className,
  variant = 'slot',
}: {
  className?: string;
  variant?: 'inline' | 'slot';
}) =>
  variant === 'inline' ? (
    <Spinner className={className} size="icon" />
  ) : (
    <View
      className={cn(
        'h-8 w-8 pointer-events-none items-center justify-center',
        className
      )}
    >
      <Spinner size="icon" />
    </View>
  );

const CardActionsMenuContent = ({
  isGenerating,
  onCopy,
  onDelete,
  onEdit,
  onManage,
  onRefresh,
  onTweak,
  isTweakDisabled,
}: {
  isGenerating?: boolean;
  isTweakDisabled?: boolean;
  onCopy?: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onManage?: () => void;
  onRefresh?: () => Promise<unknown> | void;
  onTweak?: () => void;
}) => {
  const menu = Menu.useContext();
  const [isRefreshPending, setIsRefreshPending] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    if (!onRefresh || isRefreshPending) return;
    setIsRefreshPending(true);

    try {
      await onRefresh();
      setIsRefreshPending(false);
      menu.onOpenChange(false);
    } catch {
      setIsRefreshPending(false);
      // noop
    }
  }, [isRefreshPending, menu, onRefresh]);

  return (
    <Menu.Content align="end">
      <Menu.Item disabled={isRefreshPending} onPress={onEdit}>
        <Icon className="text-placeholder" icon={NotePencil} />
        <Text>Edit</Text>
      </Menu.Item>
      {!!onTweak && (
        <Menu.Item
          disabled={isTweakDisabled || isGenerating || isRefreshPending}
          onPress={onTweak}
        >
          <Icon className="text-placeholder" icon={MagicWand} />
          <Text>Tweak</Text>
        </Menu.Item>
      )}
      {!!onRefresh && (
        <Menu.Item
          closeOnPress={false}
          disabled={isGenerating || isRefreshPending}
          onPress={handleRefresh}
        >
          {isRefreshPending ? (
            <View className="size-5 items-center justify-center">
              <Spinner className="text-placeholder" size="xs" />
            </View>
          ) : (
            <Icon className="text-placeholder" icon={ArrowClockwise} />
          )}
          <Text>Refresh</Text>
        </Menu.Item>
      )}
      {!!onManage && (
        <Menu.Item disabled={isRefreshPending} onPress={onManage}>
          <Icon className="text-placeholder" icon={ListNumbers} />
          <Text>Reorder</Text>
        </Menu.Item>
      )}
      {!!onCopy && (
        <Menu.Item disabled={isRefreshPending} onPress={onCopy}>
          <Icon className="text-placeholder" icon={StackSimple} />
          <Text>Copy to</Text>
        </Menu.Item>
      )}
      <Menu.Separator />
      <Menu.Item disabled={isRefreshPending} onPress={onDelete}>
        <Icon className="text-destructive" icon={Trash} />
        <Text className="text-destructive">Delete</Text>
      </Menu.Item>
    </Menu.Content>
  );
};

export const CardActionsMenu = ({
  buttonSize = 'icon',
  className,
  containerClassName,
  iconSize,
  isGenerating,
  onDelete,
  onCopy,
  onEdit,
  onManage,
  onRefresh,
  onTweak,
  isTweakDisabled,
  generatingIndicator = 'icon-slot',
  showGeneratingIndicator = true,
}: {
  buttonSize?: ButtonProps['size'];
  className?: string;
  containerClassName?: string;
  generatingIndicator?: 'icon-slot' | 'inline';
  iconSize?: number;
  isGenerating?: boolean;
  isTweakDisabled?: boolean;
  onCopy?: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onManage?: () => void;
  onRefresh?: () => Promise<unknown> | void;
  onTweak?: () => void;
  showGeneratingIndicator?: boolean;
}) => (
  <PressPropagationBoundary>
    <View className={cn('flex-row gap-1 items-center', containerClassName)}>
      {isGenerating && showGeneratingIndicator && (
        <CardGeneratingIndicator
          variant={generatingIndicator === 'inline' ? 'inline' : 'slot'}
        />
      )}
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button
            accessibilityLabel="Card actions"
            className={buttonSize === 'icon' ? 'size-8 rounded-lg' : undefined}
            size={buttonSize}
            variant="ghost"
            wrapperClassName={className ?? 'rounded-lg'}
          >
            <Icon
              className="text-muted-foreground"
              icon={DotsThreeVertical}
              size={iconSize}
            />
          </Button>
        </Menu.Trigger>
        <CardActionsMenuContent
          isGenerating={isGenerating}
          isTweakDisabled={isTweakDisabled}
          onCopy={onCopy}
          onDelete={onDelete}
          onEdit={onEdit}
          onManage={onManage}
          onRefresh={onRefresh}
          onTweak={onTweak}
        />
      </Menu.Root>
    </View>
  </PressPropagationBoundary>
);
