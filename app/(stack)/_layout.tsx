import { WebPushIosSetupSheet } from '@/features/account/web-push-ios-setup-sheet';
import { InviteDeleteSheet } from '@/features/invites/invite-delete-sheet';
import { InviteLogsSheet } from '@/features/invites/invite-logs-sheet';
import { InviteQrSheet } from '@/features/invites/invite-qr-sheet';
import { LogDeleteSheet } from '@/features/logs/log-delete-sheet';
import { LogEditSheet } from '@/features/logs/log-edit-sheet';
import { LogMembersSheet } from '@/features/logs/log-members-sheet';
import { LogTagsSheet } from '@/features/logs/log-tags-sheet';
import { TagDeleteSheet } from '@/features/logs/tag-delete-sheet';
import { RecordAudioSheet } from '@/features/records/record-audio-sheet';
import { RecordCreateSheet } from '@/features/records/record-create-sheet';
import { RecordDeleteSheet } from '@/features/records/record-delete-sheet';
import { ReplyCreateSheet } from '@/features/records/reply-create-sheet';
import { ReplyDeleteSheet } from '@/features/records/reply-delete-sheet';
import { MemberLogsSheet } from '@/features/teams/member-logs-sheet';
import { MemberRemoveSheet } from '@/features/teams/member-remove-sheet';
import { TeamDeleteSheet } from '@/features/teams/team-delete-sheet';
import { TeamLeaveSheet } from '@/features/teams/team-leave-sheet';
import { TeamSwitchSheet } from '@/features/teams/team-switch-sheet';
import { Stack } from 'expo-router';
import * as React from 'react';

export default function Layout() {
  return (
    <React.Fragment>
      <Stack screenOptions={{ headerShown: false }} />
      <ReplyCreateSheet />
      <ReplyDeleteSheet />
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
