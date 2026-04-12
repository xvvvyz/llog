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
  const [isAtTop, setIsAtTop] = React.useState(true);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const innerRef = React.useRef<LegendListRef>(null);
  const ref = listRef ?? innerRef;

  return (
    <View
      className={cn(
        !horizontal && 'border-y border-b-transparent border-t-transparent',
        !isAtTop && !horizontal && 'border-t-border',
        !isAtBottom && !horizontal && 'border-b-border',
        wrapperClassName
      )}
    >
      <LegendList<T>
        horizontal={horizontal}
        onLoad={(event) => {
          onLoad?.(event);
          if (!ref.current) return;
          const { isAtEnd, isAtStart } = ref.current.getState();
          setIsAtBottom(isAtEnd);
          setIsAtTop(isAtStart);
        }}
        onScroll={(event) => {
          onScroll?.(event);
          const { contentOffset } = event.nativeEvent;

          React.startTransition(() => {
            setIsAtTop(contentOffset.y < 4);

            setIsAtBottom(
              contentOffset.y >
                event.nativeEvent.contentSize.height -
                  event.nativeEvent.layoutMeasurement.height -
                  4
            );
          });
        }}
        recycleItems
        ref={ref}
        {...props}
      />
    </View>
  );
};

List.displayName = 'List';
