import { TextContext } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { cssInterop } from 'nativewind';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import React, { ComponentType, useContext, useMemo } from 'react';

interface IconProps extends PhosphorIconProps {
  className?: string;
  icon: ComponentType<PhosphorIconProps>;
}

const interopCache = new WeakMap<
  ComponentType<PhosphorIconProps>,
  ComponentType<PhosphorIconProps & { className?: string }>
>();

const getInteropIcon = (icon: ComponentType<PhosphorIconProps>) => {
  let wrapped = interopCache.get(icon);

  if (!wrapped) {
    wrapped = cssInterop(icon, {
      className: {
        target: 'style',
        nativeStyleToProp: { color: true, opacity: true } as Record<
          string,
          boolean
        >,
      },
    });
    interopCache.set(icon, wrapped);
  }

  return wrapped;
};

export const Icon = ({ icon, className, size = 20, ...props }: IconProps) => {
  const textClass = useContext(TextContext);
  const InteropIcon = useMemo(() => getInteropIcon(icon), [icon]);

  return (
    <InteropIcon
      className={cn('shrink-0', textClass, className)}
      size={size}
      {...props}
    />
  );
};
