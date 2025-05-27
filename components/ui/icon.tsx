import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/utilities/cn';
import { LucideIcon } from 'lucide-react-native';
import { cssInterop } from 'nativewind';
import React, { ComponentProps, useContext } from 'react';

interface IconProps extends ComponentProps<LucideIcon> {
  className?: string;
  icon: LucideIcon;
}

export const Icon = ({
  icon: IconComponent,
  className,
  ...props
}: IconProps) => {
  const textClass = useContext(TextClassContext);

  const StyledIcon = cssInterop(IconComponent, {
    className: {
      target: 'style',
      nativeStyleToProp: { color: true, opacity: true },
    },
  });

  return (
    <StyledIcon className={cn('shrink-0', textClass, className)} {...props} />
  );
};
