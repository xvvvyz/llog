export type SearchResultType = 'record' | 'comment' | 'log';

export type SearchMediaItem = {
  id: string;
  type: string;
  uri: string;
  previewUri?: string;
};

export type SearchProfile = {
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
  date?: string | number;
  logId?: string;
  logName?: string;
  logColor?: number;
  recordId?: string;
  author?: { id: string; name: string; image?: { uri: string } };
  media?: SearchMediaItem[];
  profiles?: SearchProfile[];
};
