import { WebPushIosSetupSheet } from '@/features/account/components/web-push-ios-setup-sheet';
import { InviteDeleteSheet } from '@/features/invites/components/invite-delete-sheet';
import { InviteLogsSheet } from '@/features/invites/components/invite-logs-sheet';
import { InviteQrSheet } from '@/features/invites/components/invite-qr-sheet';
import { LogDeleteSheet } from '@/features/logs/components/log-delete-sheet';
import { LogEditSheet } from '@/features/logs/components/log-edit-sheet';
import { LogMembersSheet } from '@/features/logs/components/log-members-sheet';
import { LogTagsSheet } from '@/features/logs/components/log-tags-sheet';
import { TagDeleteSheet } from '@/features/logs/components/tag-delete-sheet';
import { RecordAudioSheet } from '@/features/records/components/record-audio-sheet';
import { RecordCreateSheet } from '@/features/records/components/record-create-sheet';
import { RecordDeleteSheet } from '@/features/records/components/record-delete-sheet';
import { ReplyCreateSheet } from '@/features/records/components/reply-create-sheet';
import { ReplyDeleteSheet } from '@/features/records/components/reply-delete-sheet';
import { MemberLogsSheet } from '@/features/teams/components/member-logs-sheet';
import { MemberRemoveSheet } from '@/features/teams/components/member-remove-sheet';
import { TeamDeleteSheet } from '@/features/teams/components/team-delete-sheet';
import { TeamLeaveSheet } from '@/features/teams/components/team-leave-sheet';
import { TeamSwitchSheet } from '@/features/teams/components/team-switch-sheet';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Stack } from 'expo-router';
import * as React from 'react';
import { Platform } from 'react-native';

export default function Layout() {
  return (
    <React.Fragment>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="record/[recordId]/media"
          options={Platform.select<NativeStackNavigationOptions>({
            android: {},
            ios: {
              animation: 'simple_push',
              animationMatchesGesture: true,
              fullScreenGestureEnabled: false,
              gestureEnabled: true,
            },
            web: {
              animation: 'none',
            },
          })}
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
