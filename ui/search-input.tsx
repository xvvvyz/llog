import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import type { IconProps } from 'phosphor-react-native';
import { MagnifyingGlass, X } from 'phosphor-react-native';
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
        <View className="absolute left-3 top-1/2 -translate-y-1/2">
          <Icon className="text-placeholder" icon={MagnifyingGlass} size={20} />
        </View>
        <Input
          ref={ref}
          className={cn('px-10', className)}
          onChangeText={setQuery}
          placeholder={placeholder}
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
