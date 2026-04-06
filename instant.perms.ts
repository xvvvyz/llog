// https://www.instantdb.com/docs/permissions

import { InstantRules } from '@instantdb/react-native';
import { Role } from './enums/roles';

const isOwner = `'${Role.Owner}_' + auth.id + '_' + data.teamId in`;
const isAdmin = `'${Role.Admin}_' + auth.id + '_' + data.teamId in`;

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
      `${isOwner} data.ref('team.roles.key') || ${isAdmin} data.ref('team.roles.key')`,
    ],
    allow: {
      view: 'isTeamMember && (!hasLog || canManage || isLogMember)',
      create: 'isTeamMember',
      update: 'false',
      delete: 'false',
    },
  },
  $users: {
    bind: ['isTeammate', "data.id in data.ref('ui.team.roles.user.id')"],
    allow: {
      view: 'auth.id == data.id || isTeammate',
      create: 'false',
      delete: 'false',
      update: 'false',
    },
  },
  attrs: {
    allow: {
      create: 'false',
    },
  },
  comments: {
    bind: [
      'isValidText',
      'newData.text == null || size(newData.text) <= 10240',
      'isAuthor',
      "data.ref('author.user.id') == auth.ref('$user.id')",
      'isDraft',
      'data.isDraft == true',
      'isTeamMember',
      "auth.id in data.ref('record.log.team.roles.user.id')",
      'isLogMember',
      "auth.id in data.ref('record.log.profiles.user.id')",
      'canManage',
      `${isOwner} data.ref('record.log.team.roles.key') || ${isAdmin} data.ref('record.log.team.roles.key')`,
    ],
    allow: {
      view: '(!isDraft && isTeamMember && (canManage || isLogMember)) || isAuthor',
      create: 'isAuthor && isTeamMember && (canManage || isLogMember)',
      update: '(isAuthor || canManage) && isValidText',
      delete: 'isAuthor || canManage',
      link: {
        reactions: 'auth.id != null',
        activities: 'auth.id != null',
      },
    },
  },
  media: {
    bind: [
      'hasOneLink',
      "size(data.ref('record.id')) + size(data.ref('comment.id')) + size(data.ref('profile.id')) == 1",
      'isProfileOwner',
      "auth.id in data.ref('profile.user.id')",
      'isRecordAuthor',
      "auth.id in data.ref('record.author.user.id')",
      'isCommentAuthor',
      "auth.id in data.ref('comment.author.user.id')",
      'isRecordTeamMember',
      "auth.id in data.ref('record.log.team.roles.user.id')",
      'isCommentTeamMember',
      "auth.id in data.ref('comment.record.log.team.roles.user.id')",
      'isRecordLogMember',
      "auth.id in data.ref('record.log.profiles.user.id')",
      'isCommentLogMember',
      "auth.id in data.ref('comment.record.log.profiles.user.id')",
      'canManageRecord',
      `${isOwner} data.ref('record.log.team.roles.key') || ${isAdmin} data.ref('record.log.team.roles.key')`,
      'canManageComment',
      `${isOwner} data.ref('comment.record.log.team.roles.key') || ${isAdmin} data.ref('comment.record.log.team.roles.key')`,
      'canViewRecordMedia',
      'isRecordTeamMember && (canManageRecord || isRecordLogMember)',
      'canViewCommentMedia',
      'isCommentTeamMember && (canManageComment || isCommentLogMember)',
      'isTeammate',
      "auth.id in data.ref('profile.user.roles.team.roles.user.id')",
    ],
    allow: {
      view: 'isProfileOwner || isTeammate || canViewRecordMedia || canViewCommentMedia',
      create:
        'hasOneLink && (isProfileOwner || canViewRecordMedia || canViewCommentMedia)',
      delete:
        'isProfileOwner || isRecordAuthor || isCommentAuthor || canManageRecord || canManageComment',
    },
  },
  inviteLinks: {
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
  logTags: {
    bind: [
      'isValidName',
      'newData.name == null || size(newData.name) <= 16',
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'canManage',
      `${isOwner} data.ref('team.roles.key') || ${isAdmin} data.ref('team.roles.key')`,
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
      `${isOwner} data.ref('team.roles.key') || ${isAdmin} data.ref('team.roles.key')`,
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
    ],
    allow: {
      view: 'isAuthenticated',
      create: 'isAuthenticated && isValidName',
      update: 'isProfileOwner && isValidName',
      delete: 'isProfileOwner',
      link: {
        records: 'auth.id != null',
        comments: 'auth.id != null',
        reactions: 'auth.id != null',
        actorActivities: 'auth.id != null',
      },
    },
  },
  reactions: {
    bind: [
      'isAuthor',
      "data.ref('author.user.id') == auth.ref('$user.id')",
      'isRecordTeamMember',
      "auth.id in data.ref('record.log.team.roles.user.id')",
      'isCommentTeamMember',
      "auth.id in data.ref('comment.record.log.team.roles.user.id')",
      'isRecordLogMember',
      "auth.id in data.ref('record.log.profiles.user.id')",
      'isCommentLogMember',
      "auth.id in data.ref('comment.record.log.profiles.user.id')",
      'canManageRecord',
      `${isOwner} data.ref('record.log.team.roles.key') || ${isAdmin} data.ref('record.log.team.roles.key')`,
      'canManageComment',
      `${isOwner} data.ref('comment.record.log.team.roles.key') || ${isAdmin} data.ref('comment.record.log.team.roles.key')`,
      'canViewRecord',
      'isRecordTeamMember && (canManageRecord || isRecordLogMember)',
      'canViewComment',
      'isCommentTeamMember && (canManageComment || isCommentLogMember)',
    ],
    allow: {
      view: 'canViewRecord || canViewComment',
      create: 'isAuthor && (canViewRecord || canViewComment)',
      delete: 'isAuthor || canManageRecord || canManageComment',
    },
  },
  records: {
    bind: [
      'isValidText',
      'newData.text == null || size(newData.text) <= 10240',
      'isAuthor',
      "data.ref('author.user.id') == auth.ref('$user.id')",
      'isDraft',
      'data.isDraft == true',
      'isTeamMember',
      "auth.id in data.ref('log.team.roles.user.id')",
      'isLogMember',
      "auth.id in data.ref('log.profiles.user.id')",
      'canManage',
      `${isOwner} data.ref('log.team.roles.key') || ${isAdmin} data.ref('log.team.roles.key')`,
    ],
    allow: {
      view: '(!isDraft && isTeamMember && (canManage || isLogMember)) || isAuthor',
      create:
        'isAuthor && isTeamMember && (canManage || isLogMember) && isValidText',
      update: '(isAuthor || canManage) && isValidText',
      delete: 'isAuthor || canManage',
      link: {
        comments: 'auth.id != null',
        reactions: 'auth.id != null',
        activities: 'auth.id != null',
      },
    },
  },
  roles: {
    bind: [
      'isValidRole',
      `newData.role in ['${Role.Owner}', '${Role.Admin}', '${Role.Recorder}']`,
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
      update:
        'isTeamOwner && isValidRole && isValidUserId && isValidTeamId && isValidKey',
      delete: `isRoleOwner || isTeamOwner || (isTeamAdmin && data.role == '${Role.Recorder}')`,
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
