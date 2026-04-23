// https://www.instantdb.com/docs/permissions

import { InstantRules } from '@instantdb/react-native';
import { Role } from './features/teams/types/role';

const isOwner = `'${Role.Owner}_' + auth.id + '_' + data.teamId in`;
const isAdmin = `'${Role.Admin}_' + auth.id + '_' + data.teamId in`;
const canManageCurrentTeam = `${isOwner} data.ref('team.roles.key') || ${isAdmin} data.ref('team.roles.key')`;

const isOwnerFor = (teamIdRef: string) =>
  `data.ref('${teamIdRef}').exists(teamId, '${Role.Owner}_' + auth.id + '_' + teamId in auth.ref('$user.roles.key'))`;

const isAdminFor = (teamIdRef: string) =>
  `data.ref('${teamIdRef}').exists(teamId, '${Role.Admin}_' + auth.id + '_' + teamId in auth.ref('$user.roles.key'))`;

const canManageFor = (teamIdRef: string) =>
  `${isOwnerFor(teamIdRef)} || ${isAdminFor(teamIdRef)}`;

const rules = {
  $default: {
    allow: {
      $default: `false`,
    },
  },
  activities: {
    bind: [
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'hasLog',
      "size(data.ref('log.id')) > 0",
      'isLogMember',
      "auth.id in data.ref('log.profiles.user.id')",
      'canManage',
      canManageCurrentTeam,
      'hasReaction',
      "size(data.ref('reaction.id')) > 0",
      'isReactionAuthor',
      "data.ref('reaction.author.user.id') == auth.ref('$user.id')",
      'isReactionRecordAuthor',
      "auth.id in data.ref('reaction.record.author.user.id')",
      'isReactionReplyAuthor',
      "auth.id in data.ref('reaction.reply.author.user.id')",
      'isReactionReplyRecordAuthor',
      "auth.id in data.ref('reaction.reply.record.author.user.id')",
      'isReactionRecordTeamMember',
      "auth.id in data.ref('reaction.record.log.team.roles.user.id')",
      'isReactionReplyTeamMember',
      "auth.id in data.ref('reaction.reply.record.log.team.roles.user.id')",
      'canManageReactionRecord',
      canManageFor('reaction.record.log.team.id'),
      'canManageReactionReply',
      canManageFor('reaction.reply.record.log.team.id'),
    ],
    allow: {
      view: 'isTeamMember && (!hasLog || canManage || isLogMember)',
      create: 'isTeamMember',
      update: 'false',
      delete:
        'hasReaction && (isReactionAuthor || (isReactionRecordAuthor && isReactionRecordTeamMember) || (isReactionReplyAuthor && isReactionReplyTeamMember) || (isReactionReplyRecordAuthor && isReactionReplyTeamMember) || canManageReactionRecord || canManageReactionReply)',
    },
  },
  $users: {
    bind: ['isTeammate', "data.id in data.ref('ui.team.roles.user.id')"],
    allow: {
      view: 'auth.id == data.id || isTeammate',
      create: 'true',
      delete: 'false',
      update: 'false',
    },
  },
  attrs: {
    allow: {
      create: 'false',
    },
  },
  replies: {
    bind: [
      'isValidNewText',
      'newData.text == null || size(newData.text) <= 10240',
      'isAuthor',
      "data.ref('author.user.id') == auth.ref('$user.id')",
      'isRecordAuthor',
      "data.ref('record.author.user.id') == auth.ref('$user.id')",
      'isDraft',
      'data.isDraft == true',
      'isTeamMember',
      "auth.id in data.ref('record.log.team.roles.user.id')",
      'isLogMember',
      "auth.id in data.ref('record.log.profiles.user.id')",
      'canManage',
      canManageFor('record.log.team.id'),
      'canDeleteOwn',
      'isAuthor && isTeamMember',
      'canDeleteFromOwnRecord',
      'isRecordAuthor && isTeamMember',
    ],
    allow: {
      view: 'isTeamMember && ((!isDraft && (canManage || isLogMember)) || isAuthor)',
      create: 'isAuthor && isTeamMember && (canManage || isLogMember)',
      update: 'isAuthor && isTeamMember && isValidNewText',
      delete: 'canDeleteOwn || canDeleteFromOwnRecord || canManage',
      link: {
        reactions: 'auth.id != null',
        activities: 'auth.id != null',
      },
    },
  },
  media: {
    bind: [
      'hasOneLink',
      "size(data.ref('record.id')) + size(data.ref('reply.id')) + size(data.ref('profile.id')) + size(data.ref('team.id')) == 1",
      'isProfileOwner',
      "auth.id in data.ref('profile.user.id')",
      'isTeamImageManager',
      canManageFor('team.id'),
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'isRecordAuthor',
      "auth.id in data.ref('record.author.user.id')",
      'isReplyAuthor',
      "auth.id in data.ref('reply.author.user.id')",
      'isReplyRecordAuthor',
      "auth.id in data.ref('reply.record.author.user.id')",
      'isRecordTeamMember',
      "auth.id in data.ref('record.log.team.roles.user.id')",
      'isReplyTeamMember',
      "auth.id in data.ref('reply.record.log.team.roles.user.id')",
      'isRecordLogMember',
      "auth.id in data.ref('record.log.profiles.user.id')",
      'isReplyLogMember',
      "auth.id in data.ref('reply.record.log.profiles.user.id')",
      'canManageRecord',
      canManageFor('record.log.team.id'),
      'canManageReply',
      canManageFor('reply.record.log.team.id'),
      'canViewRecordMedia',
      'isRecordTeamMember && (canManageRecord || isRecordLogMember)',
      'canViewReplyMedia',
      'isReplyTeamMember && (canManageReply || isReplyLogMember)',
      'isTeammate',
      "auth.id in data.ref('profile.user.roles.team.roles.user.id')",
    ],
    allow: {
      view: 'isProfileOwner || isTeammate || isTeamMember || canViewRecordMedia || canViewReplyMedia',
      create: 'hasOneLink && (isProfileOwner || isTeamImageManager)',
      delete:
        'isProfileOwner || isTeamImageManager || (isRecordAuthor && isRecordTeamMember) || (isReplyAuthor && isReplyTeamMember) || (isReplyRecordAuthor && isReplyTeamMember) || canManageRecord || canManageReply',
    },
  },
  invites: {
    bind: [
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'isTeamOwner',
      `'${Role.Owner}_' + auth.id + '_' + data.teamId in data.ref('team.roles.key')`,
      'isTeamAdmin',
      `'${Role.Admin}_' + auth.id + '_' + data.teamId in data.ref('team.roles.key')`,
      'canManage',
      'isTeamOwner || isTeamAdmin',
    ],
    allow: {
      view: 'isTeamMember',
      create: 'false',
      update: 'false',
      delete: 'canManage',
    },
  },
  tags: {
    bind: [
      'isValidName',
      'newData.name == null || size(newData.name) <= 16',
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'canManage',
      canManageCurrentTeam,
    ],
    allow: {
      view: 'isTeamMember',
      create: 'canManage && isValidName',
      update: 'canManage && isValidName',
      delete: 'canManage',
    },
  },
  logs: {
    bind: [
      'isValidName',
      'newData.name == null || size(newData.name) <= 32',
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'isLogMember',
      "auth.id in data.ref('profiles.user.id')",
      'canManage',
      canManageCurrentTeam,
    ],
    allow: {
      view: 'isTeamMember && (canManage || isLogMember)',
      create: 'canManage && isValidName',
      update: 'canManage && isValidName',
      delete: 'canManage',
      link: {
        records: 'auth.id != null',
        activities: 'auth.id != null',
      },
    },
  },
  profiles: {
    bind: [
      'isValidName',
      'newData.name == null || size(newData.name) <= 32',
      'isAuthenticated',
      'auth.id != null',
      'isProfileOwner',
      "data.ref('user.id') == auth.ref('$user.id')",
      'hasSharedLogAccess',
      "auth.id != null && auth.id in data.ref('logs.profiles.user.id')",
      'hasManagedTeamOwnerAccess',
      `data.ref('user.roles.team.id').exists(teamId, '${Role.Owner}_' + auth.id + '_' + teamId in auth.ref('$user.roles.key'))`,
      'hasManagedTeamAdminAccess',
      `data.ref('user.roles.team.id').exists(teamId, '${Role.Admin}_' + auth.id + '_' + teamId in auth.ref('$user.roles.key'))`,
      'hasManagedTeamAccess',
      'hasManagedTeamOwnerAccess || hasManagedTeamAdminAccess',
    ],
    allow: {
      view: 'isProfileOwner || hasSharedLogAccess || hasManagedTeamAccess',
      create: 'isAuthenticated && isValidName',
      update: 'isProfileOwner && isValidName',
      delete: 'isProfileOwner',
      link: {
        records: 'auth.id != null',
        replies: 'auth.id != null',
        reactions: 'auth.id != null',
        actorActivities: 'auth.id != null',
      },
    },
  },
  subscriptions: {
    bind: ['isOwner', "data.ref('user.id') == auth.ref('$user.id')"],
    allow: {
      view: 'isOwner',
      create: 'isOwner',
      update: 'isOwner',
      delete: 'isOwner',
    },
  },
  reactions: {
    bind: [
      'isAuthor',
      "data.ref('author.user.id') == auth.ref('$user.id')",
      'isRecordAuthor',
      "auth.id in data.ref('record.author.user.id')",
      'isReplyAuthor',
      "auth.id in data.ref('reply.author.user.id')",
      'isReplyRecordAuthor',
      "auth.id in data.ref('reply.record.author.user.id')",
      'isRecordTeamMember',
      "auth.id in data.ref('record.log.team.roles.user.id')",
      'isReplyTeamMember',
      "auth.id in data.ref('reply.record.log.team.roles.user.id')",
      'isRecordLogMember',
      "auth.id in data.ref('record.log.profiles.user.id')",
      'isReplyLogMember',
      "auth.id in data.ref('reply.record.log.profiles.user.id')",
      'canManageRecord',
      canManageFor('record.log.team.id'),
      'canManageReply',
      canManageFor('reply.record.log.team.id'),
      'canViewRecord',
      'isRecordTeamMember && (canManageRecord || isRecordLogMember)',
      'canViewReply',
      'isReplyTeamMember && (canManageReply || isReplyLogMember)',
    ],
    allow: {
      view: 'canViewRecord || canViewReply',
      create: 'isAuthor && (canViewRecord || canViewReply)',
      delete:
        'isAuthor || (isRecordAuthor && isRecordTeamMember) || (isReplyAuthor && isReplyTeamMember) || (isReplyRecordAuthor && isReplyTeamMember) || canManageRecord || canManageReply',
    },
  },
  records: {
    bind: [
      'isValidNewText',
      'newData.text == null || size(newData.text) <= 10240',
      'isAuthor',
      "data.ref('author.user.id') == auth.ref('$user.id')",
      'onlyModifiesText',
      "request.modifiedFields.all(field, field in ['text'])",
      'onlyModifiesPinnedState',
      "request.modifiedFields.all(field, field in ['isPinned'])",
      'isDraft',
      'data.isDraft == true',
      'isTeamMember',
      "auth.id in data.ref('log.team.roles.user.id')",
      'isLogMember',
      "auth.id in data.ref('log.profiles.user.id')",
      'canManage',
      canManageFor('log.team.id'),
      'canDeleteOwn',
      'isAuthor && isTeamMember',
    ],
    allow: {
      view: 'isTeamMember && ((!isDraft && (canManage || isLogMember)) || isAuthor)',
      create:
        'isAuthor && isTeamMember && (canManage || isLogMember) && isValidNewText',
      update:
        '(isAuthor && isTeamMember && onlyModifiesText && isValidNewText) || (canManage && !isDraft && onlyModifiesPinnedState)',
      delete: 'canDeleteOwn || canManage',
      link: {
        replies: 'auth.id != null',
        reactions: 'auth.id != null',
        activities: 'auth.id != null',
      },
    },
  },
  roles: {
    bind: [
      'isValidRole',
      `newData.role in ['${Role.Owner}', '${Role.Admin}', '${Role.Member}']`,
      'isValidUserId',
      "newData.userId in data.ref('user.id')",
      'isValidTeamId',
      "newData.teamId in data.ref('team.id')",
      'isValidKey',
      "newData.key == newData.role + '_' + newData.userId + '_' + newData.teamId",
      'isFirstRole',
      "size(data.ref('team.roles.id')) == 1",
      'isRoleOwner',
      "data.ref('user.id') == auth.ref('$user.id')",
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'isTeamAdmin',
      `'${Role.Admin}_' + auth.id + '_' + data.teamId in data.ref('team.roles.key')`,
      'isTeamOwner',
      `'${Role.Owner}_' + auth.id + '_' + data.teamId in data.ref('team.roles.key')`,
    ],
    allow: {
      view: 'isTeamMember',
      create:
        '(isFirstRole || isTeamOwner || isTeamAdmin) && isValidRole && isValidUserId && isValidTeamId && isValidKey',
      update: `(isTeamOwner || (isTeamAdmin && !isRoleOwner && ((data.role == '${Role.Member}' && newData.role == '${Role.Admin}') || (data.role == '${Role.Admin}' && newData.role == '${Role.Member}')))) && isValidRole && isValidUserId && isValidTeamId && isValidKey`,
      delete: `isRoleOwner || isTeamOwner || (isTeamAdmin && data.role == '${Role.Member}')`,
    },
  },
  teams: {
    bind: [
      'isValidName',
      'newData.name == null || size(newData.name) <= 32',
      'isAuthenticated',
      'auth.id != null',
      'isTeamMember',
      "auth.id in data.ref('roles.user.id')",
      'isTeamOwner',
      `'${Role.Owner}_' + auth.id + '_' + data.id in data.ref('roles.key')`,
      'isTeamAdmin',
      `'${Role.Admin}_' + auth.id + '_' + data.id in data.ref('roles.key')`,
      'canManage',
      'isTeamOwner || isTeamAdmin',
      'hasTeamId',
      'data.id == ruleParams.teamId',
    ],
    allow: {
      view: 'isTeamMember || hasTeamId',
      create: 'isAuthenticated && isValidName',
      update: 'canManage && isValidName',
      delete: 'isTeamOwner',
      link: { activities: 'auth.id != null' },
    },
  },
  ui: {
    allow: {
      $default: "data.ref('user.id') == auth.ref('$user.id')",
    },
  },
} satisfies InstantRules;

export default rules;
