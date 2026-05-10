import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type TagType = 'log' | 'record';

export type Tag = InstaQLEntity<typeof schema, 'tags'>;
