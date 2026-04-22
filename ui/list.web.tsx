import { cn } from '@/lib/cn';
import { LegendListProps } from '@legendapp/list';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

export type ListHandle = {
  scrollToEnd: (options?: { animated?: boolean }) => void;
  scrollToOffset: (params: { animated?: boolean; offset: number }) => void;
};

export const List = <T,>({
  horizontal,
  listRef,
  onScroll,
  wrapperClassName,
  ...props
}: LegendListProps<T> & {
  listRef?: React.Ref<ListHandle | null>;
  wrapperClassName?: string;
}) => {
  const scrollViewRef = React.useRef<ScrollView>(null);

  const { contentContainerClassName, ...restProps } = props as typeof props & {
    contentContainerClassName?: string;
  };

  const renderItem = restProps.renderItem as
    | ((info: { item: T; index: number }) => React.ReactElement | null)
    | undefined;

  const keyExtractor = restProps.keyExtractor as
    | ((item: T, index: number) => string)
    | undefined;

  const ItemSeparator = restProps.ItemSeparatorComponent as
    | React.ComponentType
    | undefined;

  React.useImperativeHandle(
    listRef,
    () => ({
      scrollToEnd: (options) => scrollViewRef.current?.scrollToEnd(options),
      scrollToOffset: ({ animated, offset }) =>
        scrollViewRef.current?.scrollTo(
          horizontal ? { animated, x: offset } : { animated, y: offset }
        ),
    }),
    [horizontal]
  );

  return (
    <View className={cn(!horizontal && 'flex-1', wrapperClassName)}>
      <ScrollView
        className="flex-1"
        horizontal={horizontal}
        keyboardDismissMode={restProps.keyboardDismissMode}
        keyboardShouldPersistTaps={restProps.keyboardShouldPersistTaps}
        onScroll={onScroll}
        ref={scrollViewRef}
        scrollEventThrottle={16}
      >
        <View
          className={contentContainerClassName}
          style={restProps.contentContainerStyle}
        >
          {restProps.ListHeaderComponent as React.ReactNode}
          {restProps.numColumns && restProps.numColumns > 1 ? (
            <View className="flex-row flex-wrap">
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
