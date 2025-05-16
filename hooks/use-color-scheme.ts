import { useColorScheme as useColorSchemePrimative } from 'react-native';

export const useColorScheme = () => useColorSchemePrimative() ?? 'light';
