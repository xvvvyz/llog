import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type Media = InstaQLEntity<typeof schema, 'media'>;
