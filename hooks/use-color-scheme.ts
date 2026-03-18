import { useColorScheme as useColorSchemePrimative } from 'react-native';

export const useColorScheme = (): 'light' | 'dark' => {
  const scheme = useColorSchemePrimative();
  return scheme === 'dark' ? 'dark' : 'light';
};
