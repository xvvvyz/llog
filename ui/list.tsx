import { cn } from '@/lib/cn';
import { LegendList, LegendListProps, LegendListRef } from '@legendapp/list';
import * as React from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';

const StyledLegendList = withUniwind(LegendList, {
  contentContainerStyle: {
    fromClassName: 'contentContainerClassName',
  },
}) as typeof LegendList;

export type ListHandle = {
  scrollToEnd: (options?: { animated?: boolean; viewOffset?: number }) => void;
  scrollToOffset: (params: { animated?: boolean; offset: number }) => void;
};

export const List = <T,>({
  horizontal,
  listRef,
  onLoad,
  onScroll,
  wrapperClassName,
  ...props
}: LegendListProps<T> & {
  listRef?: React.Ref<ListHandle | null>;
  wrapperClassName?: string;
}) => {
  const innerRef = React.useRef<LegendListRef>(null);

  React.useImperativeHandle(
    listRef,
    () => ({
      scrollToEnd: (options) => innerRef.current?.scrollToEnd(options),
      scrollToOffset: (params) => innerRef.current?.scrollToOffset(params),
    }),
    []
  );

  return (
    <View className={cn(!horizontal && 'flex-1', wrapperClassName)}>
      <StyledLegendList<T>
        horizontal={horizontal}
        onLoad={onLoad}
        onScroll={onScroll}
        recycleItems
        ref={innerRef}
        {...props}
      />
    </View>
  );
};

List.displayName = 'List';
