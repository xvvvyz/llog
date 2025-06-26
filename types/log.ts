import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type Log = InstaQLEntity<typeof schema, 'logs'>;
