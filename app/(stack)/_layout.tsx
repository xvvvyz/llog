import { ImagesSheet } from '@/components/images-sheet';
import { LogDeleteSheet } from '@/components/log-delete-sheet';
import { LogEditSheet } from '@/components/log-edit-sheet';
import { LogTagsSheet } from '@/components/log-tags-sheet';
import { RecordCreateSheet } from '@/components/record-create-sheet';
import { TagDeleteSheet } from '@/components/tag-delete-sheet';
import { Stack } from 'expo-router';
import { Fragment } from 'react';

export default function Layout() {
  return (
    <Fragment>
      <Stack screenOptions={{ headerShown: false }} />
      <LogEditSheet />
      <LogTagsSheet />
      <RecordCreateSheet />
      <LogDeleteSheet />
      <TagDeleteSheet />
      <ImagesSheet />
    </Fragment>
  );
}
