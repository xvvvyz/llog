import { TextContext } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { cssInterop } from 'nativewind';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import * as React from 'react';

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
