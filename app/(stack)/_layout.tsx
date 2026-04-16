import { CommentCreateSheet } from '@/components/comment-create-sheet';
import { CommentDeleteSheet } from '@/components/comment-delete-sheet';
import { InviteDeleteSheet } from '@/components/invite-delete-sheet';
import { InviteLogsSheet } from '@/components/invite-logs-sheet';
import { InviteQrSheet } from '@/components/invite-qr-sheet';
import { LogDeleteSheet } from '@/components/log-delete-sheet';
import { LogEditSheet } from '@/components/log-edit-sheet';
import { LogMembersSheet } from '@/components/log-members-sheet';
import { LogTagsSheet } from '@/components/log-tags-sheet';
import { MemberLogsSheet } from '@/components/member-logs-sheet';
import { MemberRemoveSheet } from '@/components/member-remove-sheet';
import { RecordAudioSheet } from '@/components/record-audio-sheet';
import { RecordCreateSheet } from '@/components/record-create-sheet';
import { RecordDeleteSheet } from '@/components/record-delete-sheet';
import { TagDeleteSheet } from '@/components/tag-delete-sheet';
import { TeamDeleteSheet } from '@/components/team-delete-sheet';
import { TeamLeaveSheet } from '@/components/team-leave-sheet';
import { TeamSwitchSheet } from '@/components/team-switch-sheet';
import { WebPushIosSetupSheet } from '@/components/web-push-ios-setup-sheet';
import { Stack } from 'expo-router';
import * as React from 'react';

export default function Layout() {
  return (
    <React.Fragment>
      <Stack screenOptions={{ headerShown: false }} />
      <CommentCreateSheet />
      <CommentDeleteSheet />
      <InviteDeleteSheet />
      <InviteLogsSheet />
      <InviteQrSheet />
      <LogEditSheet />
      <LogMembersSheet />
      <LogTagsSheet />
      <MemberLogsSheet />
      <MemberRemoveSheet />
      <RecordAudioSheet />
      <RecordCreateSheet />
      <RecordDeleteSheet />
      <LogDeleteSheet />
      <TagDeleteSheet />
      <TeamDeleteSheet />
      <TeamLeaveSheet />
      <TeamSwitchSheet />
      <WebPushIosSetupSheet />
    </React.Fragment>
  );
}
