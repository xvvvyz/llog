import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { cn } from '@/utilities/cn';
import { Search, X } from 'lucide-react-native';
import { View } from 'react-native';

import { ComponentPropsWithoutRef, ComponentRef, forwardRef } from 'react';

export const SearchInput = forwardRef<
  ComponentRef<typeof Input>,
  ComponentPropsWithoutRef<typeof Input> & {
    className?: string;
    placeholder?: string;
    query: string;
    setQuery: (query: string) => void;
    wrapperClassName?: string;
  }
>(
  (
    {
      className,
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
          <Icon icon={Search} className="text-placeholder" size={20} />
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
            onPress={() => setQuery('')}
            size="icon"
            variant="ghost"
            wrapperClassName="rounded-full absolute right-1 top-1/2 -translate-y-1/2"
          >
            <Icon className="text-muted-foreground" icon={X} size={20} />
          </Button>
        )}
      </View>
    );
  }
);

SearchInput.displayName = 'SearchInput';
