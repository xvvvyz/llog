import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type Tag = InstaQLEntity<typeof schema, 'tags'>;
