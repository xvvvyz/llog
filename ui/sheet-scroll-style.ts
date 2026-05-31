import { cva, type VariantProps } from 'class-variance-authority';

export const SHEET_SCROLL_VIEW_CLASS_NAME =
  '-mx-px max-h-64 min-h-0 border-b border-border-secondary border-x rounded-b-4xl md:max-h-96 md:rounded-b-3xl border-continuous';

export const sheetScrollContentVariants = cva('mx-auto w-full max-w-lg', {
  defaultVariants: { variant: 'default' },
  variants: {
    variant: {
      default: 'px-8 py-6 md:p-4',
      flush: 'py-8 md:py-4',
      rows: 'gap-2 px-8 py-8 md:p-4',
    },
  },
});

export type SheetScrollContentVariantProps = VariantProps<
  typeof sheetScrollContentVariants
>;
