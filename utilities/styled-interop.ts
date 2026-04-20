import { styled } from 'react-native-css';

type StyledInteropOptions = {
  passThrough?: boolean;
};

export const styledInterop = styled as unknown as <C>(
  component: C,
  mapping: Record<string, unknown>,
  options?: StyledInteropOptions
) => C;
