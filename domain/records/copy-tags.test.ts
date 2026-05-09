import { resolveCopyDraftTagIdsForTargetLog } from '@/domain/records/copy-tags';
import { describe, expect, test } from 'bun:test';

describe('resolveCopyDraftTagIdsForTargetLog', () => {
  test('maps source tags to destination tags by normalized name', () => {
    expect(
      resolveCopyDraftTagIdsForTargetLog({
        sourceTags: [
          {
            id: 'source-perf',
            logs: [{ id: 'source-log' }],
            name: ' Perf ',
            type: 'record',
          },
        ],
        targetLogId: 'target-log',
        targetTags: [{ id: 'target-perf', name: 'perf' }],
      })
    ).toEqual(['target-perf']);
  });

  test('keeps tags already linked to the destination log', () => {
    expect(
      resolveCopyDraftTagIdsForTargetLog({
        sourceTags: [
          {
            id: 'shared-perf',
            logs: [{ id: 'target-log' }],
            name: 'perf',
            type: 'record',
          },
        ],
        targetLogId: 'target-log',
        targetTags: [{ id: 'shared-perf', name: 'perf' }],
      })
    ).toEqual(['shared-perf']);
  });

  test('ignores non-record and non-overlapping tags', () => {
    expect(
      resolveCopyDraftTagIdsForTargetLog({
        sourceTags: [
          { id: 'log-tag', name: 'perf', type: 'log' },
          { id: 'source-dag', name: 'dag', type: 'record' },
        ],
        targetLogId: 'target-log',
        targetTags: [{ id: 'target-perf', name: 'perf' }],
      })
    ).toEqual([]);
  });
});
