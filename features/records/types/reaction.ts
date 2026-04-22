import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type Reaction = InstaQLEntity<typeof schema, 'reactions'>;
