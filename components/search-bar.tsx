import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react-native';
import { View } from 'react-native';

export const SearchBar = ({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (query: string) => void;
}) => (
  <View className="relative md:mr-2">
    <View className="absolute left-3 top-3 md:top-2.5">
      <Icon icon={Search} className="text-placeholder" size={20} aria-hidden />
    </View>
    <Input
      accessibilityHint="Type to filter your logs"
      accessibilityLabel="Search logs"
      autoCapitalize="none"
      autoComplete="off"
      className="px-10 md:h-10 md:w-56"
      onChangeText={setQuery}
      placeholder="Search"
      returnKeyType="done"
      value={query}
    />
    {!!query.length && (
      <Button
        accessibilityHint="Clears the search input"
        accessibilityLabel="Clear search"
        className="size-8"
        onPress={() => setQuery('')}
        size="icon"
        variant="ghost"
        wrapperClassName="rounded-full absolute right-1.5 top-1.5 md:right-1 md:top-1"
      >
        <Icon
          icon={X}
          className="text-muted-foreground"
          size={16}
          aria-hidden
        />
      </Button>
    )}
  </View>
);
