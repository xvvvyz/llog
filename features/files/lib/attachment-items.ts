export type AttachmentPreviewItem<TFile, TPending> =
  | { id: string; item: TFile; kind: 'file'; order: number }
  | { id: string; item: TPending; kind: 'pending'; order: number };

export const getAttachmentPreviewItems = <
  TFile extends { id: string; order?: number | null },
  TPending extends { id: string; order: number },
>({
  files,
  pending,
}: {
  files: TFile[];
  pending: TPending[];
}): AttachmentPreviewItem<TFile, TPending>[] => {
  const byId = new Map<string, AttachmentPreviewItem<TFile, TPending>>();

  for (const item of pending) {
    byId.set(item.id, {
      id: item.id,
      item,
      kind: 'pending',
      order: item.order,
    });
  }

  for (const item of files) {
    byId.set(item.id, {
      id: item.id,
      item,
      kind: 'file',
      order: item.order ?? 0,
    });
  }

  return [...byId.values()].sort((a, b) => a.order - b.order);
};
