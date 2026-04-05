import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type Activity = InstaQLEntity<typeof schema, 'activities'>;
