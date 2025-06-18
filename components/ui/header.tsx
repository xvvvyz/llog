import { useHeaderHeight } from '@/hooks/use-header-height';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './text';

export const Header = ({
  left,
  right,
  title,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  title?: string;
}) => {
  const height = useHeaderHeight();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-3 md:px-8" style={{ height }}>
        <View className="flex-1 web:md:flex-none">{left}</View>
        <View className="flex-2">
          <Text
            className="android:text-lg truncate font-medium web:md:text-xl"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <View className="flex-1 items-end">{right}</View>
      </View>
    </View>
  );
};
