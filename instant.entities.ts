import type schema from '@/instant.schema';
import type { InstaQLEntity } from '@instantdb/react-native';

export type Activity = InstaQLEntity<typeof schema, 'activities'>;

export type Card = InstaQLEntity<typeof schema, 'cards'>;

export type CardRefreshDebounce = InstaQLEntity<
  typeof schema,
  'cardRefreshDebounces'
>;

export type FileItem = InstaQLEntity<typeof schema, 'files'>;

export type Invite = InstaQLEntity<typeof schema, 'invites'>;

export type Link = InstaQLEntity<typeof schema, 'links'>;

export type Log = InstaQLEntity<typeof schema, 'logs'>;

export type Profile = InstaQLEntity<typeof schema, 'profiles'>;

export type Reaction = InstaQLEntity<typeof schema, 'reactions'>;

export type Record = InstaQLEntity<typeof schema, 'records'>;

export type Reply = InstaQLEntity<typeof schema, 'replies'>;

export type Tag = InstaQLEntity<typeof schema, 'tags'>;

export type Team = InstaQLEntity<typeof schema, 'teams'>;

export type Template = InstaQLEntity<typeof schema, 'templates'>;
