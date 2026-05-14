import * as React from 'react';

type ComposerTextMirrorState = {
  displayText: string;
  lastExternalText: string;
  latestText: string;
  resetKey?: string;
};

export const getNextComposerTextMirrorState = ({
  current,
  resetKey,
  text,
}: {
  current: ComposerTextMirrorState;
  resetKey?: string;
  text: string;
}): ComposerTextMirrorState => {
  if (current.resetKey !== resetKey) {
    return {
      displayText: text,
      lastExternalText: text,
      latestText: text,
      resetKey,
    };
  }

  const hasLocalEdit = current.latestText !== current.lastExternalText;

  if (!hasLocalEdit || text === current.latestText) {
    return {
      displayText: text,
      lastExternalText: text,
      latestText: text,
      resetKey,
    };
  }

  return { ...current, lastExternalText: text, resetKey };
};

export const useComposerLatestText = ({
  resetKey,
  text,
}: {
  resetKey?: string;
  text: string;
}) => {
  const [displayText, setDisplayText] = React.useState(text);
  const displayTextRef = React.useRef(text);
  const latestTextRef = React.useRef(text);
  const lastExternalTextRef = React.useRef(text);
  const resetKeyRef = React.useRef(resetKey);

  React.useLayoutEffect(() => {
    const next = getNextComposerTextMirrorState({
      current: {
        displayText: displayTextRef.current,
        lastExternalText: lastExternalTextRef.current,
        latestText: latestTextRef.current,
        resetKey: resetKeyRef.current,
      },
      resetKey,
      text,
    });

    latestTextRef.current = next.latestText;
    lastExternalTextRef.current = next.lastExternalText;
    resetKeyRef.current = next.resetKey;

    if (displayTextRef.current !== next.displayText) {
      displayTextRef.current = next.displayText;
      setDisplayText(next.displayText);
    }
  }, [resetKey, text]);

  const setLatestText = React.useCallback((nextText: string) => {
    latestTextRef.current = nextText;
    displayTextRef.current = nextText;
    setDisplayText(nextText);
  }, []);

  return { displayText, latestTextRef, setLatestText };
};
