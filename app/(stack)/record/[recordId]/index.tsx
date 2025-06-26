import { RecordCommentForm } from '@/components/record-comment-form';
import { RecordOrComment } from '@/components/record-or-comment';
import { BackButton } from '@/components/ui/back-button';
import { Header } from '@/components/ui/header';
import { List } from '@/components/ui/list';
import { Loading } from '@/components/ui/loading';
import { useRecord } from '@/queries/use-record';
import { cn } from '@/utilities/cn';
import { textToTitle } from '@/utilities/text-to-title';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { TextInput, View } from 'react-native';

export default function Index() {
  const commentRef = useRef<TextInput>(null);
  const params = useLocalSearchParams<{ focus?: string; recordId: string }>();

  const record = useRecord({ id: params.recordId });

  const data = useMemo(
    () => [{ ...record, comments: undefined }, ...record.comments],
    [record]
  );

  const handleOnLoad = useCallback(() => {
    if (!params.focus) return;
    commentRef.current?.focus();
  }, [params.focus]);

  return (
    <View className="flex-1 bg-card">
      <Header
        left={<BackButton />}
        title={textToTitle(record.text)}
        titleClassName="md:text-center"
        titleWrapperClassName="md:absolute"
      />
      {record.isLoading ? (
        <Loading />
      ) : (
        <List
          ItemSeparatorComponent={() => (
            <View className="mt-4 h-px bg-border" />
          )}
          contentContainerClassName="mx-auto w-full max-w-lg px-4"
          data={data}
          estimatedItemSize={100}
          initialScrollIndex={params.focus ? data.length - 1 : 0}
          keyExtractor={(item) => item.id ?? ''}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          maintainScrollAtEnd
          maintainVisibleContentPosition
          onLoad={handleOnLoad}
          renderItem={({ index, item }) => (
            <RecordOrComment
              className={cn(
                'mt-4 border-transparent',
                index === 0 && 'md:mt-8',
                index === record.comments.length && 'mb-28 md:mb-8'
              )}
              record={item}
            />
          )}
        />
      )}
      <RecordCommentForm recordId={params.recordId} textareaRef={commentRef} />
    </View>
  );
}
