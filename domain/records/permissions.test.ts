import * as recordPermissions from '@/domain/records/permissions';
import { Role } from '@/domain/teams/role';
import { describe, expect, test } from 'bun:test';

describe('record permissions', () => {
  test('allows scoped authors', () => {
    expect(
      recordPermissions.canDeleteRecord({
        actorRole: Role.Member,
        hasLog: true,
        isAuthor: true,
        isDraft: false,
      })
    ).toBe(true);
  });

  test('denies stale authors', () => {
    expect(
      recordPermissions.canDeleteRecord({
        actorRole: null,
        hasLog: true,
        isAuthor: true,
        isDraft: false,
      })
    ).toBe(false);
  });

  test('allows logless drafts', () => {
    expect(
      recordPermissions.canDeleteRecord({
        actorRole: null,
        hasLog: false,
        isAuthor: true,
        isDraft: true,
      })
    ).toBe(true);
  });

  test('allows managers', () => {
    expect(
      recordPermissions.canDeleteRecord({
        actorRole: Role.Admin,
        hasLog: true,
        isAuthor: false,
        isDraft: false,
      })
    ).toBe(true);
  });
});
