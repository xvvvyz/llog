import { describe, expect, test } from 'bun:test';
import { HTTPException } from 'hono/http-exception';
import * as recordCopy from '@/api/records/record-copy';

describe('copy targets', () => {
  test('normalizes ids', () => {
    expect(
      recordCopy.normalizeTargetLogIds([' log-a ', 'log-b', 'log-a'])
    ).toEqual(['log-a', 'log-b']);
  });

  test('rejects blank ids', () => {
    expect(() => recordCopy.normalizeTargetLogIds(['log-a', '  '])).toThrow(
      HTTPException
    );
  });
});

describe('copy payloads', () => {
  test('clones files', () => {
    expect(
      recordCopy.getClonedFileData(
        {
          assetKey: 'records/record-1/file.jpg',
          mimeType: 'image/jpeg',
          name: 'file.jpg',
          order: 1.6,
          type: 'image',
        },
        3
      )
    ).toEqual({
      assetKey: 'records/record-1/file.jpg',
      mimeType: 'image/jpeg',
      name: 'file.jpg',
      order: 2,
      type: 'image',
    });
  });

  test('clones links', () => {
    expect(
      recordCopy.getClonedLinkData(
        { label: 'Docs', url: 'https://example.com' },
        'team-1',
        4
      )
    ).toEqual({
      label: 'Docs',
      order: 4,
      teamId: 'team-1',
      url: 'https://example.com',
    });
  });
});

describe('copy draft team', () => {
  test('uses single target team', () => {
    expect(
      recordCopy.getCopyDraftTeamId({
        sourceTeamId: 'team-source',
        targetLogs: [
          { id: 'log-a', teamId: 'team-target' },
          { id: 'log-b', teamId: 'team-target' },
        ],
      })
    ).toBe('team-target');
  });

  test('keeps source team', () => {
    expect(
      recordCopy.getCopyDraftTeamId({
        sourceTeamId: 'team-source',
        targetLogs: [
          { id: 'log-a', teamId: 'team-a' },
          { id: 'log-b', teamId: 'team-b' },
        ],
      })
    ).toBe('team-source');
  });
});
