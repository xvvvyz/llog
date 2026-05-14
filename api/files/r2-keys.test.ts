import { getFileR2Keys, getFileScope, isR2Key } from '@/api/files/r2-keys';
import { describe, expect, test } from 'bun:test';

describe('R2 keys', () => {
  test('classifies asset scopes', () => {
    expect(getFileScope('records/record-1/file.jpg')).toBe('private');
    expect(getFileScope('replies/reply-1/file.jpg')).toBe('private');
    expect(getFileScope('profiles/user-1/avatar.jpg')).toBe('public');
    expect(getFileScope('teams/team-1/avatar.jpg')).toBe('public');
    expect(getFileScope('https://cdn.example/file.jpg')).toBe('unknown');
  });

  test('returns cleanup keys', () => {
    expect(getFileR2Keys({ assetKey: 'records/record-1/file.jpg' })).toEqual([
      'records/record-1/file.jpg',
    ]);

    expect(getFileR2Keys({ assetKey: 'https://cdn.example/file.jpg' })).toEqual(
      []
    );

    expect(isR2Key(null)).toBe(false);
    expect(isR2Key('profiles/user-1/avatar.jpg')).toBe(true);
  });
});
