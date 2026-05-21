import { McpSheet } from '@/features/account/components/mcp-sheet';
import { WebPushIosSetupSheet } from '@/features/account/components/web-push-ios-setup-sheet';
import { LogCardCopyToSheet } from '@/features/cards/components/card-copy-to-sheet';
import { LogCardDetailSheet } from '@/features/cards/components/card-detail-sheet';
import { LogCardEditorSheet } from '@/features/cards/components/card-editor-sheet';
import { LogCardTweakSheet } from '@/features/cards/components/card-tweak-sheet';
import { LogCardsSheet } from '@/features/cards/components/cards-sheet';
import { useSignInHref } from '@/features/account/lib/auth-redirect';
import { InviteDeleteSheet } from '@/features/invites/components/delete-sheet';
import { InviteSheet } from '@/features/invites/components/invite-sheet';
import { InviteLinkDeleteSheet } from '@/features/invites/components/link-delete-sheet';
import { InviteLogsSheet } from '@/features/invites/components/logs-sheet';
import { LogDeleteSheet } from '@/features/logs/components/delete-sheet';
import { LogEditSheet } from '@/features/logs/components/edit-sheet';
import { LogMembersSheet } from '@/features/logs/components/members-sheet';
import { LogTagsSheet } from '@/features/logs/components/tags-sheet';
import { LogTemplateCopyEditorSheet } from '@/features/logs/components/template-copy-editor-sheet';
import { LogTemplateCopyToSheet } from '@/features/logs/components/template-copy-to-sheet';
import { LogTemplateDeleteSheet } from '@/features/logs/components/template-delete-sheet';
import { LogTemplateEditorSheet } from '@/features/logs/components/template-editor-sheet';
import { LogTemplatesSheet } from '@/features/logs/components/templates-sheet';
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
import { db } from '@/lib/db';
import { Redirect, Stack } from 'expo-router';
import * as React from 'react';
import * as teamSheet from '@/features/teams/components/team-sheet';

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
      <InviteSheet />
      <InviteLinkDeleteSheet />
      <LogEditSheet />
      <LogCardsSheet />
      <LogCardCopyToSheet />
      <LogCardDetailSheet />
      <LogCardEditorSheet />
      <LogCardTweakSheet />
      <LogMembersSheet />
      <LogTemplatesSheet />
      <LogTemplateCopyToSheet />
      <LogTemplateCopyEditorSheet />
      <LogTemplateEditorSheet />
      <LogTemplateDeleteSheet />
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
      <teamSheet.TeamSheet />
      <teamSheet.TeamMembersSheet />
      <TeamDeleteSheet />
      <TeamLeaveSheet />
      <McpSheet />
      <WebPushIosSetupSheet />
    </React.Fragment>
  );
}
