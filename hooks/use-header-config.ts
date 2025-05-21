import { useBreakpoints } from '@/hooks/use-breakpoints';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Platform } from 'react-native';

type HeaderConfig = Pick<
  NativeStackNavigationOptions & BottomTabNavigationOptions,
  | 'headerBackVisible'
  | 'headerLeftContainerStyle'
  | 'headerRightContainerStyle'
  | 'headerShadowVisible'
  | 'headerStyle'
  | 'headerTitleAlign'
  | 'headerTitleContainerStyle'
  | 'title'
>;

export const useHeaderConfig = (): HeaderConfig => {
  const breakpoints = useBreakpoints();
  const height = Platform.OS === 'web' && breakpoints.md ? 70 : undefined;
  const padding = Platform.OS === 'web' ? (breakpoints.md ? 16 : 8) : undefined;

  return {
    headerBackVisible: false,
    headerShadowVisible: false,
    headerStyle: { borderBottomWidth: breakpoints.md ? 1 : 0, height },
    headerTitleAlign: breakpoints.md ? 'left' : 'center',
    headerLeftContainerStyle: { paddingLeft: padding },
    headerRightContainerStyle: { paddingRight: padding },
    headerTitleContainerStyle: { marginLeft: 0, marginRight: 0 },
    title: '',
  };
};
