import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Textarea } from '@/components/ui/textarea';
import { addComment } from '@/mutations/add-comment';
import { animation } from '@/utilities/ui/utils';
import { ArrowUp } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const RecordCommentForm = ({
  textareaRef,
  recordId,
}: {
  textareaRef: React.RefObject<TextInput | null>;
  recordId: string;
}) => {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();

  const trimmedText = useMemo(() => text.trim(), [text]);

  const handleAddComment = useCallback(() => {
    if (!trimmedText || !recordId) return;
    addComment({ recordId, text: trimmedText });
    setText('');
  }, [recordId, trimmedText]);

  return (
    <Animated.View
      entering={animation(FadeInDown)}
      exiting={animation(FadeOutDown)}
      style={{ paddingBottom: insets.bottom }}
    >
      <View className="mx-auto w-full max-w-lg p-4 xs:px-8">
        <View className="relative">
          <Textarea
            className="pr-10"
            maxLength={10240}
            onChangeText={setText}
            onSubmitEditing={handleAddComment}
            placeholder="Add a comment"
            value={text}
            ref={textareaRef}
          />
          <Button
            className="size-11"
            disabled={!trimmedText}
            onPress={handleAddComment}
            variant="link"
            wrapperClassName="absolute right-0 bottom-0"
          >
            <Icon icon={ArrowUp} />
          </Button>
        </View>
      </View>
    </Animated.View>
  );
};
