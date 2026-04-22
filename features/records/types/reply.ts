import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type Reply = InstaQLEntity<typeof schema, 'replies'>;
