import { canAnalyzeSharedLogFile } from '@/api/files/file-analysis-permissions';
import { Role } from '@/domain/teams/role';
import { describe, expect, test } from 'bun:test';

describe('canAnalyzeSharedLogFile', () => {
  test('allows manager analysis', () => {
    expect(
      canAnalyzeSharedLogFile({
        actorRole: Role.Admin,
        isAuthor: false,
        isUnpublished: false,
      })
    ).toBe(true);

    expect(
      canAnalyzeSharedLogFile({
        actorRole: Role.Owner,
        isAuthor: true,
        isUnpublished: false,
      })
    ).toBe(true);
  });

  test('checks unpublished author', () => {
    expect(
      canAnalyzeSharedLogFile({
        actorRole: Role.Admin,
        isAuthor: false,
        isUnpublished: true,
      })
    ).toBe(false);

    expect(
      canAnalyzeSharedLogFile({
        actorRole: Role.Admin,
        isAuthor: true,
        isUnpublished: true,
      })
    ).toBe(true);
  });

  test('denies analysis', () => {
    expect(
      canAnalyzeSharedLogFile({
        actorRole: Role.Member,
        isAuthor: true,
        isUnpublished: false,
      })
    ).toBe(false);

    expect(
      canAnalyzeSharedLogFile({
        actorRole: null,
        isAuthor: true,
        isUnpublished: false,
      })
    ).toBe(false);
  });
});
