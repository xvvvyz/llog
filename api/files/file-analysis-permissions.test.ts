import { canAnalyzeSharedLogFile } from '@/api/files/file-analysis-permissions';
import { Role } from '@/domain/teams/role';
import { describe, expect, test } from 'bun:test';

describe('canAnalyzeSharedLogFile', () => {
  test('allows manager analysis', () => {
    expect(
      canAnalyzeSharedLogFile({
        actorRole: Role.Admin,
        isAuthor: false,
        isDraft: false,
      })
    ).toBe(true);

    expect(
      canAnalyzeSharedLogFile({
        actorRole: Role.Owner,
        isAuthor: true,
        isDraft: false,
      })
    ).toBe(true);
  });

  test('checks draft author', () => {
    expect(
      canAnalyzeSharedLogFile({
        actorRole: Role.Admin,
        isAuthor: false,
        isDraft: true,
      })
    ).toBe(false);

    expect(
      canAnalyzeSharedLogFile({
        actorRole: Role.Admin,
        isAuthor: true,
        isDraft: true,
      })
    ).toBe(true);
  });

  test('denies analysis', () => {
    expect(
      canAnalyzeSharedLogFile({
        actorRole: Role.Member,
        isAuthor: true,
        isDraft: false,
      })
    ).toBe(false);

    expect(
      canAnalyzeSharedLogFile({
        actorRole: null,
        isAuthor: true,
        isDraft: false,
      })
    ).toBe(false);
  });
});
