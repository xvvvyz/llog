import { cn } from '@/utilities/cn';
import { LegendList, LegendListProps, LegendListRef } from '@legendapp/list';
import { cssInterop } from 'nativewind';
import { RefObject, startTransition, useRef, useState } from 'react';
import { View } from 'react-native';

const StyledList = cssInterop(LegendList, {
  contentContainerClassName: 'contentContainerStyle',
}) as typeof LegendList;

export const List = <T,>({
  horizontal,
  listRef,
  onLoad,
  onScroll,
  wrapperClassName,
  ...props
}: LegendListProps<T> & {
  listRef?: RefObject<LegendListRef | null>;
  wrapperClassName?: string;
}) => {
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const innerRef = useRef<LegendListRef>(null);
  const ref = listRef ?? innerRef;

  return (
    <View
      className={cn(
        'flex-1',
        !horizontal && 'border-y border-b-transparent border-t-transparent',
        !isAtTop && !horizontal && 'border-t-border',
        !isAtBottom && !horizontal && 'border-b-border',
        wrapperClassName
      )}
    >
      <StyledList<T>
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

          startTransition(() => {
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
