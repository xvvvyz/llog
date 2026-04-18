import { RecordOrReply } from '@/components/record-or-reply';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { List } from '@/components/ui/list';
import { Loading } from '@/components/ui/loading';
import { Page } from '@/components/ui/page';
import { Text } from '@/components/ui/text';
import { useLogColor } from '@/hooks/use-log-color';
import { useSafeAreaInsets } from '@/hooks/use-safe-area-insets';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { useRecord } from '@/queries/use-record';
import { cn } from '@/utilities/cn';
import { textToTitle } from '@/utilities/text-to-title';
import { useLocalSearchParams } from 'expo-router';
import { ArrowBendDownLeft } from 'phosphor-react-native/lib/module/icons/ArrowBendDownLeft';
import * as React from 'react';
import { View } from 'react-native';

export default function Index() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ recordId: string }>();
  const renderCacheRef = React.useRef<React.ReactElement | null>(null);
  const sheetManager = useSheetManager();

  const record = useRecord({ id: params.recordId });
  const logColor = useLogColor({ id: record.log?.id });

  const data = React.useMemo(
    () => [{ ...record, replies: undefined }, ...record.replies],
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
            onPress={() => sheetManager.open('reply-create', params.recordId)}
            size="xs"
            style={{ backgroundColor: logColor?.default }}
            variant="secondary"
          >
            <Icon className="-ml-0.5 text-white" icon={ArrowBendDownLeft} />
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
        <View className="flex-1" style={{ paddingBottom: insets.bottom + 104 }}>
          <List
            contentContainerClassName="mx-auto w-full max-w-lg border border-border-secondary rounded-4xl my-4 bg-card md:my-8"
            data={data}
            estimatedItemSize={100}
            keyExtractor={(item) => item.id ?? ''}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="always"
            maintainScrollAtEnd
            maintainVisibleContentPosition
            renderItem={({ index, item }) => (
              <RecordOrReply
                className={cn(index === 0 && 'border-t-0')}
                replyId={index > 0 ? item.id : undefined}
                logId={record.log?.id}
                record={item}
                recordId={params.recordId}
                variant="compact"
              />
            )}
            wrapperClassName="flex-1"
          />
        </View>
      )}
      <View
        className="absolute bottom-8 right-8 md:hidden"
        style={{ marginBottom: insets.bottom }}
      >
        <Button
          className="size-14 rounded-full"
          onPress={() => sheetManager.open('reply-create', params.recordId)}
          size="icon"
          style={{ backgroundColor: logColor?.default }}
          variant="secondary"
          wrapperClassName="rounded-full"
        >
          <Icon className="text-white" icon={ArrowBendDownLeft} />
        </Button>
      </View>
    </Page>
  );

  return renderCacheRef.current;
}
