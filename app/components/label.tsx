import { LabelHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

const Label = ({
  className,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={twMerge('flex flex-col gap-2 text-fg-2', className)}
    {...rest}
  />
);

export default Label;
