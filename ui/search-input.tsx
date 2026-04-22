import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import type { IconProps } from 'phosphor-react-native';
import { MagnifyingGlass } from 'phosphor-react-native/lib/module/icons/MagnifyingGlass';
import { X } from 'phosphor-react-native/lib/module/icons/X';
import * as React from 'react';
import { View } from 'react-native';

export const SearchInput = React.forwardRef<
  React.ComponentRef<typeof Input>,
  React.ComponentPropsWithoutRef<typeof Input> & {
    actionIcon?: React.ComponentType<IconProps>;
    className?: string;
    onActionPress?: () => void;
    placeholder?: string;
    query: string;
    setQuery: (query: string) => void;
    wrapperClassName?: string;
  }
>(
  (
    {
      actionIcon,
      className,
      onActionPress,
      placeholder = 'Search',
      query,
      setQuery,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    return (
      <View className={cn('relative', wrapperClassName)}>
        <View className="absolute top-1/2 left-3 -translate-y-1/2">
          <Icon icon={MagnifyingGlass} className="text-placeholder" size={20} />
        </View>
        <Input
          className={cn('px-10', className)}
          onChangeText={setQuery}
          placeholder={placeholder}
          ref={ref}
          value={query}
          {...props}
        />
        {!!query.length && (
          <Button
            className="size-8"
            onPress={onActionPress ?? (() => setQuery(''))}
            size="icon"
            variant="ghost"
            wrapperClassName="rounded-full absolute right-1 top-1/2 -translate-y-1/2"
          >
            <Icon
              className="text-muted-foreground"
              icon={actionIcon ?? X}
              size={20}
            />
          </Button>
        )}
      </View>
    );
  }
);

SearchInput.displayName = 'SearchInput';
