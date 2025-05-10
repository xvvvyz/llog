import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const NAV_THEME = Object.freeze({
  dark: {
    ...DarkTheme,
    colors: {
      background: 'hsl(212 4% 4%)',
      border: 'hsl(212 4% 12%)',
      card: 'hsl(212 4% 4%)',
      notification: 'hsl(0 72% 51%)',
      primary: 'hsl(212 100% 58%)',
      text: 'hsl(0 0% 95%)',
    },
  },
  light: {
    ...DefaultTheme,
    colors: {
      background: 'hsl(0 0% 96%)',
      border: 'hsl(212 6% 84%)',
      card: 'hsl(0 0% 96%)',
      notification: 'hsl(0 84% 60%)',
      primary: 'hsl(212 100% 58%)',
      text: 'hsl(212 10% 4%)',
    },
  },
});
