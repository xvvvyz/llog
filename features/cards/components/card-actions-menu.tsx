import { Button, type ButtonProps } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { PressPropagationBoundary } from '@/ui/press-propagation-boundary';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { cn } from '@/lib/cn';
import { View } from 'react-native';

import {
  ArrowClockwise,
  DotsThreeVertical,
  ListNumbers,
  NotePencil,
  Sparkle,
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
      className={cn('h-8 w-8 items-center justify-center', className)}
      pointerEvents="none"
    >
      <Spinner size="icon" />
    </View>
  );

export const CardActionsMenu = ({
  buttonSize = 'icon',
  className,
  containerClassName,
  iconSize,
  isGenerating,
  onDelete,
  onEdit,
  onManage,
  onRefresh,
  onTweak,
  generatingIndicator = 'icon-slot',
  showGeneratingIndicator = true,
}: {
  buttonSize?: ButtonProps['size'];
  className?: string;
  containerClassName?: string;
  generatingIndicator?: 'icon-slot' | 'inline';
  iconSize?: number;
  isGenerating?: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onManage?: () => void;
  onRefresh?: () => void;
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
        <Menu.Content align="end">
          <Menu.Item onPress={onEdit}>
            <Icon className="text-placeholder" icon={NotePencil} />
            <Text>Edit</Text>
          </Menu.Item>
          {!!onTweak && (
            <Menu.Item disabled={isGenerating} onPress={onTweak}>
              <Icon className="text-placeholder" icon={Sparkle} />
              <Text>Tweak</Text>
            </Menu.Item>
          )}
          {!!onRefresh && (
            <Menu.Item disabled={isGenerating} onPress={onRefresh}>
              <Icon className="text-placeholder" icon={ArrowClockwise} />
              <Text>Refresh</Text>
            </Menu.Item>
          )}
          {!!onManage && (
            <Menu.Item onPress={onManage}>
              <Icon className="text-placeholder" icon={ListNumbers} />
              <Text>Reorder</Text>
            </Menu.Item>
          )}
          <Menu.Separator />
          <Menu.Item onPress={onDelete}>
            <Icon className="text-destructive" icon={Trash} />
            <Text className="text-destructive">Delete</Text>
          </Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </View>
  </PressPropagationBoundary>
);
