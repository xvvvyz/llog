import { cn } from '@/utilities/cn';
import { LegendList, LegendListProps, LegendListRef } from '@legendapp/list';
import { cssInterop } from 'nativewind';
import * as React from 'react';
import { View } from 'react-native';

cssInterop(LegendList, { contentContainerClassName: 'contentContainerStyle' });

export const List = <T,>({
  horizontal,
  listRef,
  onLoad,
  onScroll,
  wrapperClassName,
  ...props
}: LegendListProps<T> & {
  listRef?: React.RefObject<LegendListRef | null>;
  wrapperClassName?: string;
}) => {
  const innerRef = React.useRef<LegendListRef>(null);
  const ref = listRef ?? innerRef;

  return (
    <View className={cn(!horizontal && 'flex-1', wrapperClassName)}>
      <LegendList<T>
        horizontal={horizontal}
        onLoad={onLoad}
        onScroll={onScroll}
        recycleItems
        ref={ref}
        {...props}
      />
    </View>
  );
};

List.displayName = 'List';
