import { cn } from '@/lib/cn';
import * as React from 'react';
import { withUniwind } from 'uniwind';

import {
  LegendList,
  type LegendListProps,
  type LegendListRef,
} from '@legendapp/list/react-native';

import {
  Animated,
  Platform,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';

const StyledLegendList = withUniwind(LegendList, {
  contentContainerStyle: { fromClassName: 'contentContainerClassName' },
}) as typeof LegendList;

export type ListHandle = {
  scrollToEnd: (options?: { animated?: boolean; viewOffset?: number }) => void;
  scrollToIndex: (params: {
    animated?: boolean;
    index: number;
    viewOffset?: number;
    viewPosition?: number;
  }) => void;
  scrollToOffset: (params: { animated?: boolean; offset: number }) => void;
};

type ListProps<T> = LegendListProps<T> & {
  contentContainerClassName?: string;
  listRef?: React.Ref<ListHandle | null>;
  wrapperClassName?: string;
};

export const List = <T,>({
  horizontal,
  listRef,
  numColumns,
  renderScrollComponent,
  style,
  wrapperClassName,
  ...props
}: ListProps<T>) => {
  const innerRef = React.useRef<LegendListRef>(null);
  const shouldFilterZeroListLayout = Platform.OS === 'web' && !horizontal;

  React.useImperativeHandle(
    listRef,
    () => ({
      scrollToEnd: (options) => innerRef.current?.scrollToEnd(options),
      scrollToIndex: (params) => innerRef.current?.scrollToIndex(params),
      scrollToOffset: (params) => innerRef.current?.scrollToOffset(params),
    }),
    []
  );

  const resolvedRenderScrollComponent = React.useCallback(
    (scrollProps: ScrollViewProps) => {
      if (!shouldFilterZeroListLayout) {
        return renderScrollComponent ? (
          renderScrollComponent(scrollProps)
        ) : (
          <Animated.ScrollView {...scrollProps} />
        );
      }

      const { onLayout, ...restScrollProps } = scrollProps;

      const handleScrollLayout: ScrollViewProps['onLayout'] = (event) => {
        // Avoid LegendList's dev warning during web route transitions where
        // the scroll view can briefly report a zero-height layout.
        if (event.nativeEvent.layout.height === 0) return;
        onLayout?.(event);
      };

      return renderScrollComponent ? (
        renderScrollComponent({
          ...restScrollProps,
          onLayout: handleScrollLayout,
        })
      ) : (
        <Animated.ScrollView
          {...restScrollProps}
          onLayout={handleScrollLayout}
        />
      );
    },
    [renderScrollComponent, shouldFilterZeroListLayout]
  );

  return (
    <View className={cn(!horizontal && 'flex-1', wrapperClassName)}>
      <StyledLegendList<T>
        ref={innerRef}
        horizontal={horizontal}
        numColumns={numColumns}
        recycleItems
        style={[!horizontal && styles.verticalList, style]}
        renderScrollComponent={
          shouldFilterZeroListLayout || renderScrollComponent
            ? resolvedRenderScrollComponent
            : undefined
        }
        {...props}
      />
    </View>
  );
};

List.displayName = 'List';
const styles = StyleSheet.create({ verticalList: { flex: 1, minHeight: 1 } });
