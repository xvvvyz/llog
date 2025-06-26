import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type Role = InstaQLEntity<typeof schema, 'roles'>;
