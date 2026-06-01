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

  test('allows managed content edits', () => {
    const recordManagedTextEdit =
      'canEditManagedContent && isPublished && onlyModifiesText && isValidNewText';

    const recordManagedDateEdit =
      'canEditManagedContent && isPublished && onlyModifiesDate';

    const replyManagedTextEdit =
      'canEditManagedContent && !isDraft && onlyModifiesText && isValidNewText';

    const managedContentPolicy =
      'isOwnerByTeamId || (isAdminByTeamId && authorIsMemberByTeamId)';

    const authorMemberRole =
      "data.ref('author.user.id').exists(userId, 'member_' + userId + '_' + data.teamId in data.ref('author.user.roles.key'))";

    expect(rules.records.allow.update).toContain(recordManagedTextEdit);
    expect(rules.records.allow.update).toContain(recordManagedDateEdit);
    expect(rules.replies.allow.update).toContain(replyManagedTextEdit);
    expect(rules.records.bind).toContain(managedContentPolicy);
    expect(rules.replies.bind).toContain(managedContentPolicy);
    expect(rules.records.bind).toContain(authorMemberRole);
    expect(rules.replies.bind).toContain(authorMemberRole);
  });

  test('guards card cascades', () => {
    expect(rules.cards.allow.update).toContain('onlyModifiesCardOrder');
    expect(rules.cards.allow.delete).toBe('canManage');
  });

  test('guards notes', () => {
    const noteBindings = rules.notes.bind.join(' ');
    expect(rules.notes.allow.view).toBe('canManage');

    expect(rules.notes.allow.create).toBe(
      'canManage && isValidText && isNonEmptyText && isValidLogId && isValidTeamId'
    );

    expect(rules.notes.allow.update).toBe(
      'canManage && onlyModifiesText && isValidText'
    );

    expect(rules.notes.allow.delete).toBe('canManage');
    expect(rules.notes.allow.link.log).toContain('linkedData.id == data.logId');

    expect(rules.notes.allow.link.log).toContain(
      ') && linkedData.id == data.logId'
    );

    expect(rules.notes.allow.link.log).toContain(
      'linkedData.teamId == data.teamId'
    );

    expect(rules.logs.allow.link.note).toContain(
      "'owner_' + auth.id + '_' + data.teamId"
    );

    expect(rules.logs.allow.link.note).toContain(
      "'admin_' + auth.id + '_' + data.teamId"
    );

    expect(rules.logs.allow.link.note).not.toContain('linkedData');
    expect(noteBindings).toContain("'owner_' + auth.id + '_' + data.teamId");
    expect(noteBindings).toContain("'admin_' + auth.id + '_' + data.teamId");
    expect(noteBindings).toContain('size(newData.text) <= 10240');
    expect(noteBindings).toContain('size(newData.text) > 0');
    expect(noteBindings).not.toContain("data.id == 'note_'");
    expect(noteBindings).not.toContain("'member_'");
  });

  test('denies analyses', () => {
    expect(rules.analyses.allow.$default).toBe('false');
    expect(rules.facts.allow.$default).toBe('false');
  });
});
