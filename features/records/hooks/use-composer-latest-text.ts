import * as React from 'react';

export const useComposerLatestText = ({
  isTextareaFocused,
  text,
}: {
  isTextareaFocused: boolean;
  text: string;
}) => {
  const latestTextRef = React.useRef(text);
  const lastExternalTextRef = React.useRef(text);

  React.useEffect(() => {
    if (
      !isTextareaFocused ||
      latestTextRef.current === lastExternalTextRef.current
    ) {
      latestTextRef.current = text;
    }

    lastExternalTextRef.current = text;
  }, [isTextareaFocused, text]);

  const setLatestText = React.useCallback((nextText: string) => {
    latestTextRef.current = nextText;
  }, []);

  return { latestTextRef, setLatestText };
};
