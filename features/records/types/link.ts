import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type Link = InstaQLEntity<typeof schema, 'links'>;
