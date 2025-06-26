import { Platform } from 'react-native';

export const uriToFileLike = async (uri: string) =>
  Platform.OS === 'web'
    ? (await fetch(uri)).blob()
    : ({ name: 'file', type: 'image/webp', uri } as any);
