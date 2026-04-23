type TextareaBlurEvent = {
  currentTarget?: { value?: unknown };
  nativeEvent?: { text?: unknown };
  target?: { value?: unknown };
};

export const readTextareaBlurText = (event: unknown, fallback: string) => {
  const textareaEvent = event as TextareaBlurEvent | null;

  const values = [
    textareaEvent?.currentTarget?.value,
    textareaEvent?.target?.value,
    textareaEvent?.nativeEvent?.text,
  ];

  return (
    values.find((value): value is string => typeof value === 'string') ??
    fallback
  );
};
