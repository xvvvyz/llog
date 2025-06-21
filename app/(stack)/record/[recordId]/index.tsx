import { Record } from '@/components/record';
import { RecordCommentForm } from '@/components/record-comment-form';
import { BackButton } from '@/components/ui/back-button';
import { Header } from '@/components/ui/header';
import { List } from '@/components/ui/list';
import { Loading } from '@/components/ui/loading';
import { useRecord } from '@/queries/use-record';
import { textToTitle } from '@/utilities/ui/text-to-title';
import { cn } from '@/utilities/ui/utils';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { TextInput, View } from 'react-native';

export default function Index() {
  const commentRef = useRef<TextInput>(null);
  const params = useLocalSearchParams<{ focus?: string; recordId: string }>();

  const record = useRecord({ recordId: params.recordId });
  const data = useMemo(() => [record, ...record.comments], [record]);

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
            <View className="h-px bg-border xs:mx-4" />
          )}
          contentContainerClassName="mx-auto w-full max-w-lg"
          data={data}
          getEstimatedItemSize={(_, item) => {
            return 100;
          }}
          keyExtractor={(item) => item.id ?? ''}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          initialScrollIndex={params.focus ? data.length - 1 : 0}
          maintainScrollAtEnd
          maintainVisibleContentPosition
          onLoad={handleOnLoad}
          renderItem={({ item, index }) => (
            <View
              className={cn(
                'gap-3 border border-transparent p-8',
                index === 0 && 'md:mt-4',
                index === record.comments.length && 'md:mb-4'
              )}
            >
              <Record record={item} />
            </View>
          )}
        />
      )}
      <RecordCommentForm recordId={params.recordId} textareaRef={commentRef} />
    </View>
  );
}
