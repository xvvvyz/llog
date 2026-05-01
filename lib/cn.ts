import { ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge<'border-curve'>({
  extend: {
    classGroups: { 'border-curve': ['border-continuous', 'border-circular'] },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
