export type SheetName =
  | 'log-card-copy-to'
  | 'log-card-detail'
  | 'log-card-editor'
  | 'log-card-tweak'
  | 'log-cards'
  | 'reply-create'
  | 'reply-delete'
  | 'invite-delete'
  | 'member-remove'
  | 'invite-logs'
  | 'invite'
  | 'invite-link-delete'
  | 'log-delete'
  | 'log-edit'
  | 'log-members'
  | 'log-template-copy-to'
  | 'log-template-copy-editor'
  | 'log-template-delete'
  | 'log-template-editor'
  | 'log-templates'
  | 'log-tags'
  | 'member-logs'
  | 'mcp'
  | 'record-audio'
  | 'record-copy-to'
  | 'record-create'
  | 'record-delete'
  | 'record-detail'
  | 'record-link-attachments'
  | 'record-link-editor'
  | 'record-tags'
  | 'tag-delete'
  | 'team'
  | 'team-delete'
  | 'team-leave'
  | 'team-members'
  | 'web-push-ios-setup';

type TeamScopedPayload = { teamId?: string };
type InviteLinkPayload = { inviteId?: string; teamId?: string };

type RecordTagPayloadItem = {
  color: number;
  id: string;
  name: string;
  order: number;
  teamId: string;
  type: string;
};

export type RecordSheetLinkSnapshot = {
  id: string;
  label: string;
  localStatus?: 'error' | 'pending';
  order: number;
  teamId: string;
  url: string;
};

export type RecordSheetParent =
  | {
      id: string;
      links?: RecordSheetLinkSnapshot[];
      teamId?: string;
      type: 'record';
    }
  | {
      id: string;
      links?: RecordSheetLinkSnapshot[];
      recordId: string;
      teamId?: string;
      type: 'reply';
    };

export type SheetPayloadMap = {
  invite: InviteLinkPayload;
  'invite-link-delete': InviteLinkPayload;
  'invite-logs': TeamScopedPayload;
  'log-template-copy-editor': {
    createMissingTags?: boolean;
    logIds?: string[];
  };
  'log-template-copy-to': { hasTemplateTags?: boolean };
  'member-logs': TeamScopedPayload;
  'record-create': { logIds?: string[]; teamId?: string };
  'record-link-attachments': { parent: RecordSheetParent };
  'record-link-editor':
    | { mode: 'create'; parent: RecordSheetParent }
    | { linkId: string; mode: 'edit' };
  'record-tags': {
    authorId?: string;
    logColor?: number;
    logId?: string;
    tags?: RecordTagPayloadItem[];
    teamId?: string;
  };
  'reply-create': TeamScopedPayload;
  'team-delete': TeamScopedPayload;
  'team-leave': TeamScopedPayload;
};

export type SheetPayload<Name extends SheetName> =
  Name extends keyof SheetPayloadMap ? SheetPayloadMap[Name] : unknown;

export type SheetContextMap = {
  'log-card-copy-to': string;
  'log-card-editor': string;
  'log-template-copy-to': string;
  'log-template-editor': string;
  'record-audio': 'record' | `reply:${string}`;
  'record-create': 'copy' | 'edit';
  'record-delete': string;
  'reply-create': string;
  'reply-delete': string;
};

export type SheetContextValue<Name extends SheetName> =
  Name extends keyof SheetContextMap ? SheetContextMap[Name] : string;
