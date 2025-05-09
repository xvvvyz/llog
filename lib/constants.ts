import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const NAV_THEME = Object.freeze({
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: 'hsl(240 10% 3.9%)',
      border: 'hsl(240 3.7% 15.9%)',
      card: 'hsl(240 10% 3.9%)',
      notification: 'hsl(0 72% 51%)',
      primary: 'hsl(0 0% 98%)',
      text: 'hsl(0 0% 98%)',
    },
  },
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'hsl(0 0% 100%)',
      border: 'hsl(240 5.9% 90%)',
      card: 'hsl(0 0% 100%)',
      notification: 'hsl(0 84.2% 60.2%)',
      primary: 'hsl(240 5.9% 10%)',
      text: 'hsl(240 10% 3.9%)',
    },
  },
});
