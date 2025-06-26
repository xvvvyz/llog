import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type Team = InstaQLEntity<typeof schema, 'teams'>;
