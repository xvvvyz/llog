import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type UI = InstaQLEntity<typeof schema, 'ui'>;
