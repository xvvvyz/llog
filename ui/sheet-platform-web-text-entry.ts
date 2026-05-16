export const isTextEntryElement = (element: HTMLElement | null) => {
  const tagName = element?.tagName;

  return (
    tagName === 'TEXTAREA' ||
    tagName === 'INPUT' ||
    !!element?.isContentEditable
  );
};
