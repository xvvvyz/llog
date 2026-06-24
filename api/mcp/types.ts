import type { Db } from '@/api/middleware/db';
import type * as push from '@/api/push/web-push';
import type * as mediaMetadata from '@/domain/files/media-metadata';
import schema from '@/instant.schema';
import type { InstaQLEntity } from '@instantdb/admin';
import type { z } from 'zod/v4';

export type OAuthProps = { email: string; profileId: string; userId: string };

export type McpContext = {
  db: Db;
  env: CloudflareEnv;
  executionCtx: ExecutionContext;
  notificationDb: Db;
  props: OAuthProps;
};

type FileEntity = InstaQLEntity<typeof schema, 'files'>;
type LinkEntity = InstaQLEntity<typeof schema, 'links'>;
type LogEntity = InstaQLEntity<typeof schema, 'logs'>;
type NoteEntity = InstaQLEntity<typeof schema, 'notes'>;
type ProfileEntity = InstaQLEntity<typeof schema, 'profiles'>;
type ReactionEntity = InstaQLEntity<typeof schema, 'reactions'>;
type RecordEntity = InstaQLEntity<typeof schema, 'records'>;
type ReplyEntity = InstaQLEntity<typeof schema, 'replies'>;
type RoleEntity = InstaQLEntity<typeof schema, 'roles'>;
type TagEntity = InstaQLEntity<typeof schema, 'tags'>;
type TeamEntity = InstaQLEntity<typeof schema, 'teams'>;
type TemplateEntity = InstaQLEntity<typeof schema, 'templates'>;
type McpDate = string | number | Date;

export type McpFile = Pick<FileEntity, 'id' | 'type'> &
  Partial<
    Pick<
      FileEntity,
      | 'assetKey'
      | 'duration'
      | 'mimeType'
      | 'name'
      | 'size'
      | 'thumbnailUri'
      | 'tracks'
      | 'transcript'
      | 'uri'
    >
  >;

export type McpMediaSearchMatch = {
  endSeconds?: number;
  fileId: string;
  fileName?: string;
  kind: 'track' | 'transcript';
  snippet: string;
  startSeconds?: number;
  trackDurationSeconds?: number;
};

export type McpLink = Pick<LinkEntity, 'id' | 'label' | 'url'> &
  Partial<Pick<LinkEntity, 'order'>>;

type McpStoredPushSubscription = {
  endpoint?: string | null;
  id: string;
  subscription?: z.infer<typeof push.pushSubscriptionSchema> | null;
};

type McpUser = {
  email?: string | null;
  id: string;
  subscriptions?: McpStoredPushSubscription[];
};

export type McpProfile = {
  avatarSeedId?: ProfileEntity['avatarSeedId'];
  id: ProfileEntity['id'];
  image?: McpFile | null;
  logs?: McpLog[];
  name: ProfileEntity['name'];
  user?: McpUser;
};

export type McpTag = Pick<TagEntity, 'id' | 'name'> & {
  logs?: Pick<McpLog, 'id' | 'name'>[];
} & Partial<Pick<TagEntity, 'order' | 'teamId' | 'type'>>;

export type McpRole = Pick<RoleEntity, 'id' | 'role' | 'userId'> & {
  team?: McpTeam;
  teamId?: RoleEntity['teamId'];
  user?: McpUser;
};

export type McpTeam = Pick<TeamEntity, 'id' | 'name'> & {
  image?: McpFile | null;
  logs?: McpLog[];
  roles?: McpRole[];
};

export type McpLog = Pick<LogEntity, 'id' | 'name'> & {
  note?: Pick<NoteEntity, 'text'> | null;
  profiles?: McpProfile[];
  tags?: McpTag[];
  team?: McpTeam | null;
} & Partial<Pick<LogEntity, 'teamId'>>;

export type McpTemplate = Pick<TemplateEntity, 'id' | 'text'> & {
  log?: Pick<McpLog, 'id' | 'name' | 'teamId'> | null;
  tags?: McpTag[];
} & Partial<Pick<TemplateEntity, 'order' | 'teamId'>>;

export type McpReaction = Pick<ReactionEntity, 'emoji' | 'id'> & {
  author?: McpProfile | null;
};

export type McpReply = Pick<ReplyEntity, 'id' | 'text'> & {
  author?: McpProfile | null;
  date: McpDate;
  files?: McpFile[];
  links?: McpLink[];
  reactions?: McpReaction[];
  record?:
    | (Pick<McpRecord, 'id' | 'tags' | 'teamId'> & { log?: McpLog })
    | null;
} & Partial<Pick<ReplyEntity, 'isDraft' | 'teamId'>>;

export type McpRecord = Pick<RecordEntity, 'id' | 'status'> & {
  author?: McpProfile | null;
  date: McpDate;
  files?: McpFile[];
  links?: McpLink[];
  log?: McpLog;
  reactions?: McpReaction[];
  replies?: McpReply[];
  tags?: McpTag[];
} & Partial<Pick<RecordEntity, 'isPinned' | 'teamId' | 'text'>>;

type McpFileFields = Pick<McpFile, 'id' | 'type'> &
  Partial<
    Pick<
      McpFile,
      'assetKey' | 'duration' | 'mimeType' | 'name' | 'size' | 'thumbnailUri'
    >
  > & {
    trackCount?: number;
    tracks?: mediaMetadata.NormalizedTrack[];
    transcript?: mediaMetadata.NormalizedTranscriptSegment[];
    transcriptSegmentCount?: number;
    uri?: string;
    url?: string;
  };

export type McpViewer = {
  profile?: McpProfile;
  roles: McpRole[];
  rolesByTeamId: Map<string, McpRole>;
  teams: (Pick<McpTeam, 'id' | 'name'> & {
    image?: McpFileFields;
    role: McpRole['role'];
  })[];
  visibleLogIds: Set<string>;
  visibleLogs: McpLog[];
};
