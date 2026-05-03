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
      size,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    const resolvedSize = size ?? 'default';

    const actionButtonClassName =
      resolvedSize === 'lg'
        ? 'h-10 w-10 rounded-lg'
        : resolvedSize === 'sm'
          ? 'h-8 w-8 rounded-lg'
          : 'h-9 w-9 rounded-lg';

    const inputClassName =
      resolvedSize === 'lg'
        ? 'pl-10 pr-12'
        : resolvedSize === 'sm'
          ? 'pl-10 pr-10'
          : 'pl-10 pr-11';

    return (
      <View className={cn('relative', wrapperClassName)}>
        <View className="absolute bottom-0 left-0 top-0 w-10 items-center justify-center">
          <Icon
            className="ml-0.5 text-placeholder"
            icon={MagnifyingGlass}
            size={20}
          />
        </View>
        <Input
          ref={ref}
          className={cn(inputClassName, className)}
          onChangeText={setQuery}
          placeholder={placeholder}
          size={resolvedSize}
          value={query}
          {...props}
        />
        {!!query.length && (
          <Button
            className={actionButtonClassName}
            onPress={onActionPress ?? (() => setQuery(''))}
            size="icon"
            variant="ghost"
            wrapperClassName="absolute right-1 top-1 rounded-lg border-continuous"
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
