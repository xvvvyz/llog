import * as React from 'react';

type RunSheetSubmitOptions = { suppressError?: boolean };
type SheetSubmitControls = { keepPendingUntilClose: () => void };

export const useSheetSubmitState = ({ isOpen }: { isOpen: boolean }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isSubmittingRef = React.useRef(false);

  const resetSubmitting = React.useCallback(() => {
    isSubmittingRef.current = false;
    setIsSubmitting(false);
  }, []);

  React.useEffect(() => {
    if (!isOpen) resetSubmitting();
  }, [isOpen, resetSubmitting]);

  const runSubmit = React.useCallback(
    async (
      submit: (controls: SheetSubmitControls) => void | Promise<void>,
      options: RunSheetSubmitOptions = {}
    ) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      let keepSubmittingUntilClose = false;

      try {
        await submit({
          keepPendingUntilClose: () => {
            keepSubmittingUntilClose = true;
          },
        });
      } catch (error) {
        if (!options.suppressError) throw error;
      } finally {
        if (!keepSubmittingUntilClose) resetSubmitting();
      }
    },
    [resetSubmitting]
  );

  return { isSubmitting, isSubmittingRef, runSubmit };
};
