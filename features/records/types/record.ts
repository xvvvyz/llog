import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type Record = InstaQLEntity<typeof schema, 'records'>;
