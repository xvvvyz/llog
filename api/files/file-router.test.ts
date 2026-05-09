import { canDeleteFile } from '@/api/files/file-router';
import { Role } from '@/domain/teams/role';
import { describe, expect, test } from 'bun:test';

describe('canDeleteFile', () => {
  test('allows managed roles to delete files regardless of authorship', () => {
    expect(canDeleteFile({ actorRole: Role.Owner, isAuthor: false })).toBe(
      true
    );

    expect(canDeleteFile({ actorRole: Role.Admin, isAuthor: false })).toBe(
      true
    );
  });

  test('allows authors to delete files from accessible logs or logless drafts', () => {
    expect(canDeleteFile({ actorRole: Role.Member, isAuthor: true })).toBe(
      true
    );

    expect(canDeleteFile({ isAuthor: true, isLoglessDraft: true })).toBe(true);
  });

  test('denies members deleting other authors files and authors without access context', () => {
    expect(canDeleteFile({ actorRole: Role.Member, isAuthor: false })).toBe(
      false
    );

    expect(canDeleteFile({ isAuthor: true })).toBe(false);
  });
});
