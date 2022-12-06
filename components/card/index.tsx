import clsx from 'clsx';
import { HTMLAttributes } from 'react';

const Card = ({ children, className }: HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('w-full rounded xs:border xs:border-alpha-1 xs:bg-bg-2 xs:p-9', className)}>{children}</div>
);

export default Card;
