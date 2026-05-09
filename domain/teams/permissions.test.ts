import * as permissions from '@/domain/teams/permissions';
import { Role } from '@/domain/teams/role';
import { describe, expect, test } from 'bun:test';

describe('getTeamPermissionFlags', () => {
  test('derives team capability flags from owner, admin, member, and missing roles', () => {
    expect(permissions.getTeamPermissionFlags(Role.Owner)).toEqual({
      canDeleteTeam: true,
      canLeaveTeam: false,
      canManage: true,
      canManageInvites: true,
      canManageLogs: true,
      canManageMembers: true,
      canPinRecords: true,
      canViewRestrictedActivity: true,
      isAdmin: false,
      isOwner: true,
    });

    expect(permissions.getTeamPermissionFlags(Role.Admin)).toEqual({
      canDeleteTeam: false,
      canLeaveTeam: true,
      canManage: true,
      canManageInvites: true,
      canManageLogs: true,
      canManageMembers: true,
      canPinRecords: true,
      canViewRestrictedActivity: true,
      isAdmin: true,
      isOwner: false,
    });

    expect(permissions.getTeamPermissionFlags(Role.Member)).toMatchObject({
      canDeleteTeam: false,
      canLeaveTeam: true,
      canManage: false,
      canManageMembers: false,
      isAdmin: false,
      isOwner: false,
    });

    expect(permissions.getTeamPermissionFlags()).toMatchObject({
      canLeaveTeam: false,
      canManage: false,
    });
  });
});

describe('team member management policy', () => {
  test('owners can manage other members and admins but not themselves', () => {
    expect(
      permissions.canOpenTeamMemberMenu({
        actorRole: Role.Owner,
        targetRole: Role.Admin,
      })
    ).toBe(true);

    expect(
      permissions.canChangeTeamMemberRole({
        actorRole: Role.Owner,
        nextRole: Role.Member,
        targetRole: Role.Admin,
      })
    ).toBe(true);

    expect(
      permissions.canRemoveTeamMember({
        actorRole: Role.Owner,
        targetRole: Role.Admin,
      })
    ).toBe(true);

    expect(
      permissions.canOpenTeamMemberMenu({
        actorRole: Role.Owner,
        isSelf: true,
        targetRole: Role.Member,
      })
    ).toBe(false);
  });

  test('admins can manage non-owner roles and only remove members', () => {
    expect(
      permissions.canOpenTeamMemberMenu({
        actorRole: Role.Admin,
        targetRole: Role.Owner,
      })
    ).toBe(false);

    expect(
      permissions.canChangeTeamMemberRole({
        actorRole: Role.Admin,
        nextRole: Role.Admin,
        targetRole: Role.Member,
      })
    ).toBe(true);

    expect(
      permissions.canChangeTeamMemberRole({
        actorRole: Role.Admin,
        nextRole: Role.Member,
        targetRole: Role.Admin,
      })
    ).toBe(true);

    expect(
      permissions.canRemoveTeamMember({
        actorRole: Role.Admin,
        targetRole: Role.Admin,
      })
    ).toBe(false);

    expect(
      permissions.canRemoveTeamMember({
        actorRole: Role.Admin,
        targetRole: Role.Member,
      })
    ).toBe(true);
  });

  test('members and missing roles cannot manage team members', () => {
    for (const actorRole of [Role.Member, undefined]) {
      expect(
        permissions.canOpenTeamMemberMenu({
          actorRole,
          targetRole: Role.Member,
        })
      ).toBe(false);
    }
  });
});

describe('team visibility policy', () => {
  test('managed roles are always visible and members see peers only through shared logs', () => {
    expect(
      permissions.canViewTeamMember({
        actorRole: Role.Member,
        targetRole: Role.Admin,
      })
    ).toBe(true);

    expect(
      permissions.canViewTeamMember({
        actorLogIds: ['log-a'],
        actorRole: Role.Member,
        targetLogIds: ['log-b', 'log-a'],
        targetRole: Role.Member,
      })
    ).toBe(true);

    expect(
      permissions.canViewTeamMember({
        actorLogIds: ['log-a'],
        actorRole: Role.Member,
        targetLogIds: ['log-b'],
        targetRole: Role.Member,
      })
    ).toBe(false);

    expect(
      permissions.canViewTeamMember({
        actorRole: Role.Admin,
        targetRole: Role.Member,
      })
    ).toBe(true);
  });
});

describe('role helpers', () => {
  test('sorts known roles before unknown roles in privilege order', () => {
    const roles = [Role.Member, 'unknown', Role.Owner, Role.Admin];

    expect(
      roles.sort(
        (a, b) =>
          permissions.getRoleSortOrder(a) - permissions.getRoleSortOrder(b)
      )
    ).toEqual([Role.Owner, Role.Admin, Role.Member, 'unknown']);
  });

  test('keeps owners from being downgraded and upgrades existing members through admin invites', () => {
    expect(
      permissions.getInviteRedemptionRole({
        currentRole: Role.Owner,
        invitedRole: Role.Admin,
      })
    ).toBe(Role.Owner);

    expect(
      permissions.getInviteRedemptionRole({
        currentRole: Role.Member,
        invitedRole: Role.Admin,
      })
    ).toBe(Role.Admin);

    expect(
      permissions.getInviteRedemptionRole({
        currentRole: Role.Admin,
        invitedRole: Role.Member,
      })
    ).toBe(Role.Admin);
  });
});
