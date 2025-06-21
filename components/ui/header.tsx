import { Text } from '@/components/ui/text';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { cn } from '@/utilities/ui/utils';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const Header = ({
  left,
  right,
  title,
  titleAbsolute,
  titleClassName,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  title?: string;
  titleAbsolute?: boolean;
  titleClassName?: string;
}) => {
  const height = useHeaderHeight();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }}>
      <View
        className="flex-row items-center justify-between px-1 md:px-8"
        style={{ height }}
      >
        <View>{left}</View>
        <View
          className={cn(
            'flex-1 justify-center',
            titleAbsolute && 'absolute inset-0 md:relative'
          )}
        >
          <Text
            className={cn(
              'android:text-lg text-center font-medium md:text-left web:md:text-xl',
              titleClassName
            )}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <View>{right}</View>
      </View>
    </View>
  );
};
