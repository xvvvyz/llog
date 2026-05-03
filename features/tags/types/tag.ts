import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export const TAG_TYPES = ['log', 'record'] as const;

export type TagType = (typeof TAG_TYPES)[number];

export type Tag = InstaQLEntity<typeof schema, 'tags'>;
