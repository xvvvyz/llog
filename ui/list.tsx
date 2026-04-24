import { cn } from '@/lib/cn';
import { LegendList, LegendListProps, LegendListRef } from '@legendapp/list';
import * as React from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';

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
  wrapperClassName,
  ...props
}: ListProps<T>) => {
  const innerRef = React.useRef<LegendListRef>(null);

  React.useImperativeHandle(
    listRef,
    () => ({
      scrollToEnd: (options) => innerRef.current?.scrollToEnd(options),
      scrollToIndex: (params) => innerRef.current?.scrollToIndex(params),
      scrollToOffset: (params) => innerRef.current?.scrollToOffset(params),
    }),
    []
  );

  return (
    <View className={cn(!horizontal && 'flex-1', wrapperClassName)}>
      <StyledLegendList<T>
        ref={innerRef}
        horizontal={horizontal}
        numColumns={numColumns}
        recycleItems
        {...props}
      />
    </View>
  );
};

List.displayName = 'List';
