import { useHeaderHeight } from '@/hooks/use-header-height';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { cn } from '@/lib/cn';
import { Text } from '@/ui/text';
import { View } from 'react-native';

export const Header = ({
  className,
  left,
  right,
  title,
  titleClassName,
  titleWrapperClassName,
}: {
  className?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  title?: React.ReactNode;
  titleClassName?: string;
  titleWrapperClassName?: string;
}) => {
  const height = useHeaderHeight();
  const insets = useSafeAreaInsets();

  return (
    <View className={className} style={{ paddingTop: insets.top }}>
      <View
        className="flex-row items-center justify-between px-4 md:px-8"
        style={{ height }}
      >
        <View>{left}</View>
        {title ? (
          <View
            className={cn(
              'absolute right-20 left-20 flex-1 justify-center md:static',
              titleWrapperClassName
            )}
          >
            {typeof title === 'string' ? (
              <Text
                className={cn(
                  'android:text-lg web:md:text-xl text-center font-medium md:text-left',
                  titleClassName
                )}
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
