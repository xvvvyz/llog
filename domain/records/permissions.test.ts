import * as recordPermissions from '@/domain/records/permissions';
import { Role } from '@/domain/teams/role';
import { describe, expect, test } from 'bun:test';

describe('record permissions', () => {
  test('allows managed edits', () => {
    expect(
      recordPermissions.canEditEntry({
        actorRole: Role.Admin,
        isAuthor: false,
        targetRole: Role.Member,
      })
    ).toBe(true);

    expect(
      recordPermissions.canEditEntry({
        actorRole: Role.Owner,
        isAuthor: false,
        targetRole: Role.Admin,
      })
    ).toBe(true);
  });

  test('denies unowned edits', () => {
    expect(
      recordPermissions.canEditEntry({
        actorRole: Role.Member,
        isAuthor: false,
        targetRole: Role.Member,
      })
    ).toBe(false);

    expect(
      recordPermissions.canEditEntry({
        actorRole: Role.Admin,
        isAuthor: false,
        targetRole: Role.Admin,
      })
    ).toBe(false);

    expect(
      recordPermissions.canEditEntry({
        actorRole: Role.Admin,
        isAuthor: false,
        targetRole: Role.Owner,
      })
    ).toBe(false);
  });

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
