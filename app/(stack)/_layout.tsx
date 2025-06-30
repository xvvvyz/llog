import { ImagesSheet } from '@/components/images-sheet';
import { LogDeleteSheet } from '@/components/log-delete-sheet';
import { LogEditSheet } from '@/components/log-edit-sheet';
import { LogTagsSheet } from '@/components/log-tags-sheet';
import { RecordCreateSheet } from '@/components/record-create-sheet';
import { TagDeleteSheet } from '@/components/tag-delete-sheet';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { UI } from '@/theme/ui';
import { Stack } from 'expo-router';
import { Fragment } from 'react';

export default function Layout() {
  const colorScheme = useColorScheme();

  return (
    <Fragment>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: UI[colorScheme].background },
          headerShown: false,
        }}
      />
      <LogEditSheet />
      <LogTagsSheet />
      <RecordCreateSheet />
      <LogDeleteSheet />
      <TagDeleteSheet />
      <ImagesSheet />
    </Fragment>
  );
}
