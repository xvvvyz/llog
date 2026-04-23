import { useHeaderHeight } from '@/hooks/use-header-height';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { Text } from '@/ui/text';
import { View } from 'react-native';

export const Header = ({
  left,
  right,
  title,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  title?: React.ReactNode;
}) => {
  const height = useHeaderHeight();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }}>
      <View
        className="flex-row items-center justify-between px-4 md:px-8"
        style={{ height }}
      >
        <View>{left}</View>
        {title ? (
          <View className="absolute right-20 left-20 flex-1 justify-center md:static">
            {typeof title === 'string' ? (
              <Text
                className="android:text-lg web:md:text-xl text-center font-medium md:text-left"
                numberOfLines={1}
              >
                {title}
              </Text>
            ) : (
              title
            )}
          </View>
        ) : null}
        <View>{right}</View>
      </View>
    </View>
  );
};
