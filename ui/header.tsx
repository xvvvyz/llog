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
        className="flex-row px-4 items-center justify-between md:px-8"
        style={{ height }}
      >
        <View>{left}</View>
        {title ? (
          <View className="absolute left-20 right-20 flex-1 justify-center md:static">
            {typeof title === 'string' ? (
              <Text
                className="font-medium text-center android:text-lg md:text-left web:md:text-xl"
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
