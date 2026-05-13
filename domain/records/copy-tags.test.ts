import { resolveCopyDraftTagIdsForTargetLog } from '@/domain/records/copy-tags';
import { describe, expect, test } from 'bun:test';

describe('resolveCopyDraftTagIdsForTargetLog', () => {
  test('maps copied tags', () => {
    expect(
      resolveCopyDraftTagIdsForTargetLog({
        sourceTags: [
          {
            id: 'source-foo',
            logs: [{ id: 'source-log' }],
            name: ' Foo ',
            type: 'record',
          },
        ],
        targetLogId: 'target-log',
        targetTags: [{ id: 'target-foo', name: 'foo' }],
      })
    ).toEqual(['target-foo']);
  });

  test('keeps linked tags', () => {
    expect(
      resolveCopyDraftTagIdsForTargetLog({
        sourceTags: [
          {
            id: 'shared-foo',
            logs: [{ id: 'target-log' }],
            name: 'foo',
            type: 'record',
          },
        ],
        targetLogId: 'target-log',
        targetTags: [{ id: 'shared-foo', name: 'foo' }],
      })
    ).toEqual(['shared-foo']);
  });

  test('ignores unrelated tags', () => {
    expect(
      resolveCopyDraftTagIdsForTargetLog({
        sourceTags: [
          { id: 'log-tag', name: 'foo', type: 'log' },
          { id: 'source-bar', name: 'bar', type: 'record' },
        ],
        targetLogId: 'target-log',
        targetTags: [{ id: 'target-foo', name: 'foo' }],
      })
    ).toEqual([]);
  });
});
