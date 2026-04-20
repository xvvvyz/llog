import { TextContext } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import * as React from 'react';
import { styled } from 'react-native-css';

interface IconProps extends PhosphorIconProps {
  className?: string;
  icon: React.ComponentType<PhosphorIconProps>;
}

const interopCache = new WeakMap<
  React.ComponentType<PhosphorIconProps>,
  React.ComponentType<PhosphorIconProps & { className?: string }>
>();

const getInteropIcon = (icon: React.ComponentType<PhosphorIconProps>) => {
  let wrapped = interopCache.get(icon);

  if (!wrapped) {
    wrapped = styled(icon, { className: 'style' });
    interopCache.set(icon, wrapped);
  }

  return wrapped;
};

export const Icon = ({ icon, className, size = 20, ...props }: IconProps) => {
  const textClass = React.useContext(TextContext);
  const InteropIcon = React.useMemo(() => getInteropIcon(icon), [icon]);

  return (
    <InteropIcon
      className={cn('shrink-0', textClass, className)}
      size={size}
      {...props}
    />
  );
};
