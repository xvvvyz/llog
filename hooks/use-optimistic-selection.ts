import { useCallback, useEffect, useRef, useState } from 'react';

type PendingSelection = {
  requestId: number;
  selected: boolean;
};

export const useOptimisticSelection = ({
  onChange,
  scopeKey,
  selectedIds,
}: {
  onChange: (id: string, selected: boolean) => Promise<void>;
  scopeKey?: string | null;
  selectedIds: ReadonlySet<string>;
}) => {
  const nextRequestIdRef = useRef(0);

  const [pendingSelections, setPendingSelections] = useState<
    Record<string, PendingSelection>
  >({});

  useEffect(() => {
    setPendingSelections({});
  }, [scopeKey]);

  useEffect(() => {
    setPendingSelections((current) => {
      let didChange = false;
      const next = { ...current };

      for (const [id, entry] of Object.entries(current)) {
        if (selectedIds.has(id) === entry.selected) {
          delete next[id];
          didChange = true;
        }
      }

      return didChange ? next : current;
    });
  }, [selectedIds]);

  const getSelected = useCallback(
    (id: string) => pendingSelections[id]?.selected ?? selectedIds.has(id),
    [pendingSelections, selectedIds]
  );

  const setSelected = useCallback(
    async (id: string, selected: boolean) => {
      const requestId = ++nextRequestIdRef.current;

      setPendingSelections((current) => ({
        ...current,
        [id]: { requestId, selected },
      }));

      try {
        await onChange(id, selected);
      } catch (error) {
        setPendingSelections((current) => {
          const entry = current[id];
          if (!entry || entry.requestId !== requestId) return current;
          const next = { ...current };
          delete next[id];
          return next;
        });

        throw error;
      }
    },
    [onChange]
  );

  return { getSelected, setSelected };
};
