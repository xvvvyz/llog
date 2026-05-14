import { resolveCopyDraftTagIdsForTargetLog } from '@/domain/records/copy-tags';
import { describe, expect, test } from 'bun:test';

describe('resolveCopyDraftTagIdsForTargetLog', () => {
  test('maps copied tags', () => {
    expect(
      resolveCopyDraftTagIdsForTargetLog({
        sourceTags: [
          {
            id: 'source-ideas',
            logs: [{ id: 'source-log' }],
            name: ' Ideas ',
            type: 'record',
          },
        ],
        targetLogId: 'target-log',
        targetTags: [{ id: 'target-ideas', name: 'ideas' }],
      })
    ).toEqual(['target-ideas']);
  });

  test('keeps linked tags', () => {
    expect(
      resolveCopyDraftTagIdsForTargetLog({
        sourceTags: [
          {
            id: 'shared-ideas',
            logs: [{ id: 'target-log' }],
            name: 'ideas',
            type: 'record',
          },
        ],
        targetLogId: 'target-log',
        targetTags: [{ id: 'shared-ideas', name: 'ideas' }],
      })
    ).toEqual(['shared-ideas']);
  });

  test('ignores unrelated tags', () => {
    expect(
      resolveCopyDraftTagIdsForTargetLog({
        sourceTags: [
          { id: 'log-tag', name: 'ideas', type: 'log' },
          { id: 'source-reading', name: 'reading', type: 'record' },
        ],
        targetLogId: 'target-log',
        targetTags: [{ id: 'target-ideas', name: 'ideas' }],
      })
    ).toEqual([]);
  });
});
