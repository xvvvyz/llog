import { cn } from '@/utilities/cn';
import { LegendListProps } from '@legendapp/list';
import { ComponentType, ReactElement } from 'react';
import { ScrollView, View } from 'react-native';

export const List = <T,>({
  horizontal,
  onScroll,
  wrapperClassName,
  ...props
}: LegendListProps<T> & { wrapperClassName?: string }) => {
  const { contentContainerClassName, ...restProps } = props as typeof props & {
    contentContainerClassName?: string;
  };

  const renderItem = restProps.renderItem as
    | ((info: { item: T; index: number }) => ReactElement | null)
    | undefined;

  const keyExtractor = restProps.keyExtractor as
    | ((item: T, index: number) => string)
    | undefined;

  const ItemSeparator = restProps.ItemSeparatorComponent as
    | ComponentType
    | undefined;

  return (
    <View
      className={cn(
        !horizontal && 'border-y border-b-transparent border-t-transparent',
        wrapperClassName
      )}
    >
      <ScrollView
        horizontal={horizontal}
        keyboardDismissMode={restProps.keyboardDismissMode}
        keyboardShouldPersistTaps={restProps.keyboardShouldPersistTaps}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        <View
          className={contentContainerClassName}
          style={restProps.contentContainerStyle}
        >
          {restProps.ListHeaderComponent as React.ReactNode}
          {restProps.numColumns && restProps.numColumns > 1 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {(restProps.data ?? []).map((item, index) => (
                <View
                  key={keyExtractor?.(item, index) ?? index}
                  style={{ width: `${100 / restProps.numColumns!}%` }}
                >
                  {renderItem?.({ item, index })}
                </View>
              ))}
            </View>
          ) : (
            (restProps.data ?? []).map((item, index) => (
              <View key={keyExtractor?.(item, index) ?? index}>
                {renderItem?.({ item, index })}
                {ItemSeparator && index < (restProps.data?.length ?? 0) - 1 && (
                  <ItemSeparator />
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

List.displayName = 'List';
