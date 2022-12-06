import clsx from 'clsx';
import { LabelHTMLAttributes } from 'react';

const Label = ({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={clsx('flex flex-col gap-3 text-fg-2', className)} {...rest} />
);

export default Label;
