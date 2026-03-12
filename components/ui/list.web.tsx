import { cn } from '@/utilities/cn';
import { LegendListProps } from '@legendapp/list';
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
                  key={restProps.keyExtractor?.(item, index) ?? index}
                  style={{ width: `${100 / restProps.numColumns!}%` }}
                >
                  {restProps.renderItem?.({
                    index,
                    item,
                    target: 'Cell',
                    extraData: undefined,
                    separators: {
                      highlight: () => {},
                      unhighlight: () => {},
                      updateProps: () => {},
                    },
                  })}
                </View>
              ))}
            </View>
          ) : (
            (restProps.data ?? []).map((item, index) => (
              <View key={restProps.keyExtractor?.(item, index) ?? index}>
                {restProps.renderItem?.({
                  index,
                  item,
                  target: 'Cell',
                  extraData: undefined,
                  separators: {
                    highlight: () => {},
                    unhighlight: () => {},
                    updateProps: () => {},
                  },
                })}
                {restProps.ItemSeparatorComponent &&
                  index < (restProps.data?.length ?? 0) - 1 && (
                    <restProps.ItemSeparatorComponent />
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
