import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { cn } from '@/utilities/cn';
import { Search, X } from 'lucide-react-native';
import { View } from 'react-native';

import {
  ComponentPropsWithoutRef,
  ComponentRef,
  forwardRef,
  startTransition,
  useCallback,
  useEffect,
  useState,
} from 'react';

export const SearchInput = forwardRef<
  ComponentRef<typeof Input>,
  ComponentPropsWithoutRef<typeof Input> & {
    bottomSheet?: boolean;
    className?: string;
    placeholder?: string;
    query: string;
    setQuery: (query: string) => void;
    wrapperClassName?: string;
  }
>(
  (
    {
      bottomSheet,
      className,
      placeholder = 'Search',
      query,
      setQuery,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    const [opQuery, setOpQuery] = useState(query);
    useEffect(() => setOpQuery(query), [query]);

    const handleChange = useCallback(
      (text: string) => {
        setOpQuery(text);
        startTransition(() => setQuery(text));
      },
      [setQuery]
    );

    const handleClear = useCallback(() => {
      setOpQuery('');
      startTransition(() => setQuery(''));
    }, [setQuery]);

    return (
      <View className={cn('relative', wrapperClassName)}>
        <View className="absolute left-3 top-1/2 -translate-y-1/2">
          <Icon
            icon={Search}
            className="text-placeholder"
            size={18}
            aria-hidden
          />
        </View>
        <Input
          accessibilityHint="Type to search"
          accessibilityLabel="Search"
          autoCapitalize="none"
          autoComplete="off"
          bottomSheet={bottomSheet}
          className={cn('px-10', className)}
          onChangeText={handleChange}
          placeholder={placeholder}
          ref={ref}
          returnKeyType="done"
          size="sm"
          value={opQuery}
          {...props}
        />
        {!!query.length && (
          <Button
            accessibilityHint="Clears the search input"
            accessibilityLabel="Clear search"
            className="size-8"
            onPress={handleClear}
            size="icon"
            variant="ghost"
            wrapperClassName="rounded-full absolute right-1 top-1/2 -translate-y-1/2"
          >
            <Icon
              aria-hidden
              className="text-muted-foreground"
              icon={X}
              size={18}
            />
          </Button>
        )}
      </View>
    );
  }
);

SearchInput.displayName = 'SearchInput';
