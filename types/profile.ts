import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type Profile = InstaQLEntity<typeof schema, 'profiles'>;
