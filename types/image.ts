import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type Image = InstaQLEntity<typeof schema, 'images'>;
