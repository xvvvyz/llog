export type SearchResultType = 'record' | 'reply' | 'log';

export type SearchMediaItem = {
  id: string;
  name?: string;
  type: string;
  uri: string;
};

export type SearchProfile = {
  avatarSeedId?: string;
  id: string;
  name: string;
  uri?: string;
};

export type SearchResult = {
  id: string;
  type: SearchResultType;
  score: number;
  terms: string[];
  text: string;
  attachmentNames?: string[];
  date?: string | number;
  logId?: string;
  logName?: string;
  logColor?: number;
  recordId?: string;
  author?: {
    avatarSeedId?: string;
    id: string;
    name: string;
    image?: { uri: string };
  };
  media?: SearchMediaItem[];
  profiles?: SearchProfile[];
};
