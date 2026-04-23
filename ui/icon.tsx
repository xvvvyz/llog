import { cn } from '@/lib/cn';
import { TextContext } from '@/ui/text';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import * as React from 'react';

import {
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useResolveClassNames } from 'uniwind';

interface IconProps extends PhosphorIconProps {
  className?: string;
  icon: React.ComponentType<PhosphorIconProps>;
}

type IconResolvedStyle = ViewStyle & TextStyle & { color?: string };

function stripColor(style?: IconResolvedStyle) {
  if (!style) return undefined;
  const { color: _color, ...rest } = style;
  return rest;
}

export const Icon = ({
  color,
  icon: IconPrimitive,
  className,
  size = 20,
  style,
  ...props
}: IconProps) => {
  const textClass = React.useContext(TextContext);

  const resolvedClassStyle = StyleSheet.flatten(
    useResolveClassNames(cn('shrink-0', textClass, className))
  ) as IconResolvedStyle | undefined;

  const resolvedPropStyle = StyleSheet.flatten(
    style as StyleProp<ViewStyle | TextStyle>
  ) as IconResolvedStyle | undefined;

  const resolvedColor =
    color ??
    (typeof resolvedPropStyle?.color === 'string'
      ? resolvedPropStyle.color
      : typeof resolvedClassStyle?.color === 'string'
        ? resolvedClassStyle.color
        : undefined);

  const resolvedStyle = [
    stripColor(resolvedClassStyle),
    stripColor(resolvedPropStyle),
  ];

  return (
    <IconPrimitive
      color={resolvedColor}
      size={size}
      style={resolvedStyle}
      {...props}
    />
  );
};
