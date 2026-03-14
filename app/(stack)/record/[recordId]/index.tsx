import { RecordOrComment } from '@/components/record-or-comment';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { List } from '@/components/ui/list';
import { Loading } from '@/components/ui/loading';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { useHideOnScrollDown } from '@/hooks/use-hide-on-scroll-down';
import { useLogColor } from '@/hooks/use-log-color';
import { useRecord } from '@/queries/use-record';
import { animation } from '@/utilities/animation';
import { cn } from '@/utilities/cn';
import { textToTitle } from '@/utilities/text-to-title';
import { useLocalSearchParams } from 'expo-router';
import { ChatCircleDots } from 'phosphor-react-native';
import { ReactElement, useMemo, useRef } from 'react';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Index() {
  const hideOnScrollDown = useHideOnScrollDown();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ recordId: string }>();
  const renderCacheRef = useRef<ReactElement | null>(null);
  const sheetManager = useSheetManager();

  const record = useRecord({ id: params.recordId });
  const logColor = useLogColor({ id: record.log?.id });

  const data = useMemo(
    () => [{ ...record, comments: undefined }, ...record.comments],
    [record]
  );

  if (sheetManager.someOpen()) {
    return renderCacheRef.current;
  }

  renderCacheRef.current = (
    <Page>
      <Header
        left={<BackButton />}
        right={
          <Button
            className="hidden md:flex"
            onPress={() => sheetManager.open('comment-create', params.recordId)}
            size="xs"
            style={{ backgroundColor: logColor?.default }}
            variant="secondary"
          >
            <Icon className="-ml-0.5 text-white" icon={ChatCircleDots} />
            <Text className="text-white">Reply</Text>
          </Button>
        }
        title={textToTitle(record.text)}
        titleClassName="md:text-center"
        titleWrapperClassName="md:absolute"
      />
      {record.isLoading ? (
        <Loading />
      ) : (
        <List
          contentContainerClassName="mx-auto w-full max-w-lg border border-border-secondary rounded-4xl my-4 bg-card md:my-8"
          contentContainerStyle={{ paddingBottom: `${insets.bottom}px` }}
          data={data}
          estimatedItemSize={100}
          keyExtractor={(item) => item.id ?? ''}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          maintainScrollAtEnd
          onScroll={hideOnScrollDown.onScroll}
          maintainVisibleContentPosition
          renderItem={({ index, item }) => (
            <RecordOrComment
              className={cn(index === 0 && 'border-t-0')}
              commentId={index > 0 ? item.id : undefined}
              logId={record.log?.id}
              record={item}
              recordId={params.recordId}
              variant="compact"
            />
          )}
          wrapperClassName="flex-1"
        />
      )}
      {hideOnScrollDown.isVisible && (
        <Animated.View
          className="absolute bottom-8 right-8 md:hidden"
          entering={animation(FadeInUp)}
          exiting={animation(FadeOutUp)}
          style={{ marginBottom: insets.bottom }}
        >
          <Button
            className="size-14 rounded-full"
            onPress={() => sheetManager.open('comment-create', params.recordId)}
            size="icon"
            style={{ backgroundColor: logColor?.default }}
            variant="secondary"
            wrapperClassName="rounded-full"
          >
            <Icon className="text-white" icon={ChatCircleDots} />
          </Button>
        </Animated.View>
      )}
    </Page>
  );

  return renderCacheRef.current;
}
