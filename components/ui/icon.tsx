import { TextContext } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { cssInterop } from 'nativewind';
import { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import React, { ComponentType, useContext } from 'react';

interface IconProps extends PhosphorIconProps {
  className?: string;
  icon: ComponentType<PhosphorIconProps>;
}

export const Icon = ({ icon, className, size = 20, ...props }: IconProps) => {
  const textClass = useContext(TextContext);

  const Icon = cssInterop(icon, {
    className: {
      target: 'style',
      nativeStyleToProp: { color: true, opacity: true },
    },
  });

  return (
    <Icon
      className={cn('shrink-0', textClass, className)}
      size={size}
      {...props}
    />
  );
};
