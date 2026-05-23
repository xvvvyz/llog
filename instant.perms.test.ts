import rules from '@/instant.perms';
import { describe, expect, test } from 'bun:test';

describe('permissions', () => {
  test('guards activity links', () => {
    const activityLinks = rules.activities.allow.link;
    expect(activityLinks.actor).toContain("linkedData.ref('user.id')");
    expect(activityLinks).not.toHaveProperty('profiles');
    expect(activityLinks).not.toHaveProperty('logs');
    expect(activityLinks).not.toHaveProperty('records');
    expect(activityLinks).not.toHaveProperty('replies');
    expect(activityLinks).not.toHaveProperty('teams');
    expect(activityLinks.log).toContain("linkedData.ref('profiles.user.id')");

    expect(activityLinks.record).toContain(
      "linkedData.ref('log.profiles.user.id')"
    );

    expect(activityLinks.reply).toContain(
      "linkedData.ref('record.log.profiles.user.id')"
    );

    expect(activityLinks.team).toContain('linkedData.id == data.teamId');
  });

  test('guards log profile links', () => {
    expect(rules.logs.allow.link.profiles).toContain(
      "linkedData.ref('user.id')"
    );
  });

  test('guards activity cleanup', () => {
    expect(rules.activities.allow.delete).toContain('reaction.author.user.id');
    expect(rules.activities.allow.delete).toContain('$user.roles.key');
  });

  test('guards content activities', () => {
    expect(rules.logs.allow.link.activities).toContain(
      "auth.ref('$user.roles.team.id')"
    );

    expect(rules.logs.allow.link.activities).toContain(
      'linkedData.teamId == data.teamId'
    );

    expect(rules.records.allow.link.activities).toContain(
      'linkedData.teamId == data.teamId'
    );

    expect(rules.replies.allow.link.activities).toContain(
      'linkedData.teamId == data.teamId'
    );
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

  test('denies analyses', () => {
    expect(rules.analyses.allow.$default).toBe('false');
    expect(rules.facts.allow.$default).toBe('false');
  });
});
