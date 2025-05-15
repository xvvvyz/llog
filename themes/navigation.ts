import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const NAVIGATION_THEME = Object.freeze({
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'hsl(0 0% 94%)',
      card: 'hsl(0 0% 94%)',
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: 'hsl(0 0% 4%)',
      card: 'hsl(0 0% 4%)',
    },
  },
});
