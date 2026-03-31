import { CommentCreateSheet } from '@/components/comment-create-sheet';
import { CommentDeleteSheet } from '@/components/comment-delete-sheet';
import { InviteMemberSheet } from '@/components/invite-member-sheet';
import { LogDeleteSheet } from '@/components/log-delete-sheet';
import { LogEditSheet } from '@/components/log-edit-sheet';
import { LogTagsSheet } from '@/components/log-tags-sheet';
import { RecordAudioSheet } from '@/components/record-audio-sheet';
import { RecordCreateSheet } from '@/components/record-create-sheet';
import { RecordDeleteSheet } from '@/components/record-delete-sheet';
import { TagDeleteSheet } from '@/components/tag-delete-sheet';
import { TeamDeleteSheet } from '@/components/team-delete-sheet';
import { TeamLeaveSheet } from '@/components/team-leave-sheet';
import { TeamSwitchSheet } from '@/components/team-switch-sheet';
import { Stack } from 'expo-router';
import { Fragment } from 'react';

export default function Layout() {
  return (
    <Fragment>
      <Stack screenOptions={{ headerShown: false }} />
      <CommentCreateSheet />
      <CommentDeleteSheet />
      <InviteMemberSheet />
      <LogEditSheet />
      <LogTagsSheet />
      <RecordAudioSheet />
      <RecordCreateSheet />
      <RecordDeleteSheet />
      <LogDeleteSheet />
      <TagDeleteSheet />
      <TeamDeleteSheet />
      <TeamLeaveSheet />
      <TeamSwitchSheet />
    </Fragment>
  );
}
