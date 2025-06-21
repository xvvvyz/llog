import { cn } from '@/utilities/ui/utils';
import { LegendList, LegendListProps, LegendListRef } from '@legendapp/list';
import { cssInterop } from 'nativewind';
import { startTransition, useRef, useState } from 'react';
import { View } from 'react-native';

const StyledList = cssInterop(LegendList, {
  contentContainerClassName: 'contentContainerStyle',
}) as typeof LegendList;

export const List = <T,>({
  onLoad,
  onScroll,
  wrapperClassName,
  ...props
}: LegendListProps<T> & {
  wrapperClassName?: string;
}) => {
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const ref = useRef<LegendListRef>(null);

  return (
    <View
      className={cn(
        'flex-1 border-y border-b-transparent border-t-transparent',
        !isAtTop && 'border-t-border',
        !isAtBottom && 'border-b-border',
        wrapperClassName
      )}
    >
      <StyledList<T>
        ref={ref}
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
        {...props}
      />
    </View>
  );
};

List.displayName = 'List';
