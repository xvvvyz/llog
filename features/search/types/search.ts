import type { Profile } from '@/features/account/types/profile';
import type { FileItem } from '@/features/files/types/file';
import type { Link } from '@/features/records/types/link';
import type { Tag } from '@/features/tags/types/tag';

export type SearchResultType = 'record' | 'reply' | 'log';

export type SearchFileItem = Pick<
  FileItem,
  | 'assetKey'
  | 'duration'
  | 'id'
  | 'mimeType'
  | 'name'
  | 'thumbnailUri'
  | 'type'
  | 'uri'
>;

export type SearchLinkItem = Pick<Link, 'id' | 'label' | 'url'>;

type SearchPerson = Pick<Profile, 'avatarSeedId' | 'id' | 'name'>;

export type SearchProfile = SearchPerson & { uri?: string };

type SearchAuthor = SearchPerson & { image?: { uri: string } };

export type SearchTag = Pick<Tag, 'color' | 'id' | 'name' | 'order'>;

export type SearchResult = {
  id: string;
  type: SearchResultType;
  score: number;
  terms: string[];
  attachmentTerms?: string[];
  tagTerms?: string[];
  textTerms?: string[];
  text: string;
  attachmentNames?: string[];
  attachmentUrls?: string[];
  mediaSnippets?: string[];
  mediaTerms?: string[];
  tagItems?: SearchTag[];
  date?: string | number;
  logId?: string;
  logName?: string;
  logColor?: number;
  recordId?: string;
  author?: SearchAuthor;
  files?: SearchFileItem[];
  links?: SearchLinkItem[];
  profiles?: SearchProfile[];
};
