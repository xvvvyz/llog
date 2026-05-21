import rules from '@/instant.perms';
import { describe, expect, test } from 'bun:test';

describe('permissions', () => {
  test('guards activity links', () => {
    const activityLinks = rules.activities.allow.link;
    expect(activityLinks.logs).toContain("linkedData.ref('profiles.user.id')");

    expect(activityLinks.records).toContain(
      "linkedData.ref('log.profiles.user.id')"
    );

    expect(activityLinks.replies).toContain(
      "linkedData.ref('record.log.profiles.user.id')"
    );
  });

  test('guards activity cleanup', () => {
    expect(rules.activities.allow.delete).toContain('reaction.author.user.id');
    expect(rules.activities.allow.delete).toContain('$user.roles.key');
  });

  test('guards content activities', () => {
    expect(rules.logs.allow.link.activities).toContain('team.roles.key');

    expect(rules.records.allow.link.activities).toContain(
      "data.ref('log.profiles.user.id')"
    );

    expect(rules.replies.allow.link.activities).toContain('isLogMember');
  });

  test('allows manager text edits', () => {
    const managedTextEdit =
      'canEditManagedText && !isDraft && onlyModifiesText && isValidNewText';

    const managedTextPolicy =
      'isOwnerByTeamId || (isAdminByTeamId && authorIsMemberByTeamId)';

    const authorMemberRole =
      "data.ref('author.user.id').exists(userId, 'member_' + userId + '_' + data.teamId in data.ref('author.user.roles.key'))";

    expect(rules.records.allow.update).toContain(managedTextEdit);
    expect(rules.replies.allow.update).toContain(managedTextEdit);
    expect(rules.records.bind).toContain(managedTextPolicy);
    expect(rules.replies.bind).toContain(managedTextPolicy);
    expect(rules.records.bind).toContain(authorMemberRole);
    expect(rules.replies.bind).toContain(authorMemberRole);
  });

  test('guards card cascades', () => {
    expect(rules.cards.allow.update).toContain('onlyModifiesCardOrder');
    expect(rules.cards.allow.delete).toBe('canManage');
  });
});
