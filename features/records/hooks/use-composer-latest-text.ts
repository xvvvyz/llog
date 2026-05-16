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

  const externalTextDisappeared =
    current.latestText.trim().length > 0 &&
    current.lastExternalText === current.latestText &&
    text === '';

  if (externalTextDisappeared) {
    return {
      displayText: current.latestText,
      lastExternalText: text,
      latestText: current.latestText,
      resetKey,
    };
  }

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

export const useComposerOpenSessionKey = (isOpen: boolean) => {
  const sessionRef = React.useRef(0);
  const wasOpenRef = React.useRef(isOpen);
  if (isOpen && !wasOpenRef.current) sessionRef.current += 1;
  wasOpenRef.current = isOpen;
  return isOpen ? String(sessionRef.current) : 'closed';
};
