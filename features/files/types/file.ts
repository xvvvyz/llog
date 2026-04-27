import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react-native';

export type FileItem = InstaQLEntity<typeof schema, 'files'>;
