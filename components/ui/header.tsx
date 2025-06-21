import { Text } from '@/components/ui/text';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { cn } from '@/utilities/ui/utils';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const Header = ({
  left,
  right,
  title,
  titleClassName,
  titleWrapperClassName,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  title?: string;
  titleClassName?: string;
  titleWrapperClassName?: string;
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
        <View
          className={cn(
            'absolute left-20 right-20 -z-10 flex-1 justify-center md:static',
            titleWrapperClassName
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
