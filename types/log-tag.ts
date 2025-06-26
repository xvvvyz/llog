import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type LogTag = InstaQLEntity<typeof schema, 'logTags'>;
