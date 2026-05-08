import { McpSheet } from '@/features/account/components/mcp-sheet';
import { WebPushIosSetupSheet } from '@/features/account/components/web-push-ios-setup-sheet';
import { useSignInHref } from '@/features/account/lib/auth-redirect';
import { InviteDeleteSheet } from '@/features/invites/components/delete-sheet';
import { InviteLogsSheet } from '@/features/invites/components/logs-sheet';
import { InviteQrSheet } from '@/features/invites/components/qr-sheet';
import { LogDeleteSheet } from '@/features/logs/components/delete-sheet';
import { LogEditSheet } from '@/features/logs/components/edit-sheet';
import { LogMembersSheet } from '@/features/logs/components/members-sheet';
import { LogTagsSheet } from '@/features/logs/components/tags-sheet';
import { RecordAudioSheet } from '@/features/records/components/audio-sheet';
import { RecordCopyToSheet } from '@/features/records/components/copy-to-sheet';
import { RecordCreateSheet } from '@/features/records/components/create-sheet';
import { RecordDeleteSheet } from '@/features/records/components/delete-sheet';
import { LinkAttachmentsSheet } from '@/features/records/components/link-attachments-sheet';
import { LinkEditorSheet } from '@/features/records/components/link-editor-sheet';
import { ReplyCreateSheet } from '@/features/records/components/reply-create-sheet';
import { ReplyDeleteSheet } from '@/features/records/components/reply-delete-sheet';
import { RecordTagsSheet } from '@/features/records/components/tags-sheet';
import { TagDeleteSheet } from '@/features/tags/components/tag-delete-sheet';
import { TeamDeleteSheet } from '@/features/teams/components/delete-sheet';
import { TeamLeaveSheet } from '@/features/teams/components/leave-sheet';
import { MemberLogsSheet } from '@/features/teams/components/member-logs-sheet';
import { MemberRemoveSheet } from '@/features/teams/components/member-remove-sheet';
import { TeamSwitchSheet } from '@/features/teams/components/switch-sheet';
import { db } from '@/lib/db';
import { Redirect, Stack } from 'expo-router';
import * as React from 'react';

export default function Layout() {
  const auth = db.useAuth();
  const isSignedOut = !auth.isLoading && !auth.user;
  const signInHref = useSignInHref();
  if (isSignedOut) return <Redirect href={signInHref} />;

  return (
    <React.Fragment>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="records/[recordId]"
          options={{
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
            presentation: 'transparentModal',
          }}
        />
        <Stack.Screen
          name="records/[recordId]/files/[fileId]"
          options={{
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
            presentation: 'transparentModal',
          }}
        />
      </Stack>
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
      <RecordCopyToSheet />
      <RecordCreateSheet />
      <RecordDeleteSheet />
      <LinkAttachmentsSheet />
      <LinkEditorSheet />
      <RecordTagsSheet />
      <LogDeleteSheet />
      <TagDeleteSheet />
      <TeamDeleteSheet />
      <TeamLeaveSheet />
      <TeamSwitchSheet />
      <McpSheet />
      <WebPushIosSetupSheet />
    </React.Fragment>
  );
}
