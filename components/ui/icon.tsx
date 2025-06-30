import { TextContext } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { LucideIcon } from 'lucide-react-native';
import { cssInterop } from 'nativewind';
import React, { ComponentProps, useContext } from 'react';

interface IconProps extends ComponentProps<LucideIcon> {
  className?: string;
  icon: LucideIcon;
}

export const Icon = ({ icon, className, ...props }: IconProps) => {
  const textClass = useContext(TextContext);

  const Icon = cssInterop(icon, {
    className: {
      target: 'style',
      nativeStyleToProp: { color: true, opacity: true },
    },
  });

  return <Icon className={cn('shrink-0', textClass, className)} {...props} />;
};
