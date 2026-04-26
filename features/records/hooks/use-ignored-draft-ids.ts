import * as React from 'react';

export const useIgnoredDraftIds = () => {
  const [ignoredDraftIds, setIgnoredDraftIds] = React.useState<
    ReadonlySet<string>
  >(() => new Set());

  const ignoreDraftId = React.useCallback((id?: string) => {
    if (!id) return;

    setIgnoredDraftIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  return { ignoreDraftId, ignoredDraftIds };
};
