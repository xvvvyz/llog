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

  test('guards card cascades', () => {
    expect(rules.cards.allow.update).toContain('onlyModifiesCardOrder');
    expect(rules.cards.allow.delete).toBe('canManage');
    expect(rules.cardRefreshDebounces.allow.delete).toBe('canManage');

    expect(rules.cardRefreshDebounces.bind.join(' ')).toContain(
      '$user.roles.key'
    );
  });
});
