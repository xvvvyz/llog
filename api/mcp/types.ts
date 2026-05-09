import type { Db } from '@/api/middleware/db';
import type * as push from '@/api/push/web-push';
import type * as mediaMetadata from '@/domain/files/media-metadata';
import type { z } from 'zod/v4';

export type OAuthProps = { email: string; profileId: string; userId: string };

export type McpContext = {
  db: Db;
  env: CloudflareEnv;
  notificationDb: Db;
  props: OAuthProps;
};

export type McpFile = {
  assetKey?: string | null;
  duration?: number | null;
  id: string;
  mimeType?: string | null;
  name?: string | null;
  size?: number | null;
  thumbnailUri?: string | null;
  tracks?: unknown;
  transcript?: unknown;
  type: string;
  uri?: string | null;
};

export type McpMediaSearchMatch = {
  endSeconds?: number;
  fileId: string;
  fileName?: string;
  kind: 'track' | 'transcript';
  snippet: string;
  startSeconds?: number;
  trackDurationSeconds?: number;
};

export type McpLink = {
  id: string;
  label: string;
  order?: number | null;
  url: string;
};

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
  avatarSeedId?: string | null;
  id: string;
  image?: McpFile | null;
  logs?: McpLog[];
  name: string;
  user?: McpUser;
};

export type McpTag = {
  id: string;
  logs?: Pick<McpLog, 'id' | 'name'>[];
  name: string;
  order?: number | null;
  teamId?: string | null;
  type?: string | null;
};

export type McpRole = {
  id: string;
  role: string;
  team?: McpTeam;
  teamId?: string | null;
  user?: McpUser;
  userId: string;
};

export type McpTeam = {
  id: string;
  image?: McpFile | null;
  logs?: McpLog[];
  name: string;
  roles?: McpRole[];
};

export type McpLog = {
  color?: number | null;
  id: string;
  name: string;
  profiles?: McpProfile[];
  tags?: McpTag[];
  team?: McpTeam | null;
  teamId?: string | null;
};

export type McpReaction = {
  author?: McpProfile | null;
  emoji: string;
  id: string;
};

export type McpReply = {
  author?: McpProfile | null;
  date: string | number | Date;
  files?: McpFile[];
  id: string;
  isDraft?: boolean | null;
  links?: McpLink[];
  reactions?: McpReaction[];
  record?:
    | (Pick<McpRecord, 'id' | 'tags' | 'teamId'> & { log?: McpLog })
    | null;
  teamId?: string | null;
  text: string;
};

export type McpRecord = {
  author?: McpProfile | null;
  date: string | number | Date;
  files?: McpFile[];
  id: string;
  isDraft?: boolean | null;
  isPinned?: boolean | null;
  links?: McpLink[];
  log?: McpLog;
  reactions?: McpReaction[];
  replies?: McpReply[];
  tags?: McpTag[];
  teamId?: string | null;
  text?: string | null;
};

type McpFileFields = {
  assetKey?: string;
  duration?: number;
  id: string;
  mimeType?: string;
  name?: string;
  size?: number;
  thumbnailUri?: string;
  trackCount?: number;
  tracks?: mediaMetadata.NormalizedTrack[];
  transcript?: mediaMetadata.NormalizedTranscriptSegment[];
  transcriptSegmentCount?: number;
  type: string;
  uri?: string;
  url?: string;
};

export type McpViewer = {
  profile?: McpProfile;
  roles: McpRole[];
  rolesByTeamId: Map<string, McpRole>;
  teams: Array<{
    id: string;
    image?: McpFileFields;
    name: string;
    role: string;
  }>;
  visibleLogIds: Set<string>;
  visibleLogs: McpLog[];
};
