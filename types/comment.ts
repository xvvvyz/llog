import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type Comment = InstaQLEntity<typeof schema, 'comments'>;
