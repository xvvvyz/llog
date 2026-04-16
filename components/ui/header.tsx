import { Text } from '@/components/ui/text';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { cn } from '@/utilities/cn';
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
              'absolute left-20 right-20 flex-1 justify-center md:static',
              titleWrapperClassName
            )}
          >
            {typeof title === 'string' ? (
              <Text
                className={cn(
                  'android:text-lg text-center font-medium md:text-left web:md:text-xl',
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
