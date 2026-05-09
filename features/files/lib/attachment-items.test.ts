import { getAttachmentPreviewItems } from '@/features/files/lib/attachment-items';
import { describe, expect, test } from 'bun:test';

describe('getAttachmentPreviewItems', () => {
  test('sorts persisted and pending attachments by order', () => {
    expect(
      getAttachmentPreviewItems({
        files: [
          { id: 'file-late', order: 20, uri: 'https://example.com/late.jpg' },
          { id: 'file-default', uri: 'https://example.com/default.jpg' },
        ],
        pending: [
          { id: 'pending-middle', order: 10, uri: 'file:///middle.jpg' },
        ],
      }).map((item) => ({ id: item.id, kind: item.kind, order: item.order }))
    ).toEqual([
      { id: 'file-default', kind: 'file', order: 0 },
      { id: 'pending-middle', kind: 'pending', order: 10 },
      { id: 'file-late', kind: 'file', order: 20 },
    ]);
  });

  test('prefers persisted files over pending uploads with the same id', () => {
    const [item] = getAttachmentPreviewItems({
      files: [{ id: 'same-id', order: 2, uri: 'https://example.com/file.jpg' }],
      pending: [{ id: 'same-id', order: 1, uri: 'file:///pending.jpg' }],
    });

    expect(item).toMatchObject({ id: 'same-id', kind: 'file', order: 2 });
  });
});
