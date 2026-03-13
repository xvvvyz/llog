// https://www.instantdb.com/docs/permissions

import { InstantRules } from '@instantdb/react-native';
import { Role } from './enums/roles';

const rules = {
  $default: {
    allow: {
      $default: `false`,
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
      'isTeamMember',
      "auth.id in data.ref('record.log.team.roles.user.id')",
      'canManage',
      "auth.id in data.ref('record.log.team.roles.adminId')",
    ],
    allow: {
      view: 'isTeamMember',
      create: 'isTeamMember && isValidText',
      update: '(isAuthor || canManage) && isValidText',
      delete: 'isAuthor || canManage',
    },
  },
  images: {
    bind: [
      'hasOneLink',
      "size(data.ref('record.id')) + size(data.ref('comment.id')) + size(data.ref('profile.id')) == 1",
      'isProfileOwner',
      "data.ref('profile.user.id') == auth.ref('$user.id')",
      'isRecordAuthor',
      "data.ref('record.author.user.id') == auth.ref('$user.id')",
      'isTeamMember',
      "auth.id in data.ref('record.log.team.roles.user.id')",
      'canManage',
      "auth.id in data.ref('record.log.team.roles.adminId')",
      'isTeammate',
      "auth.id in data.ref('profile.user.roles.team.roles.user.id')",
    ],
    allow: {
      view: 'isProfileOwner || isTeamMember || isTeammate',
      create: 'hasOneLink && (isProfileOwner || isTeamMember)',
      delete: 'isProfileOwner || isRecordAuthor || canManage',
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
    ],
    allow: {
      view: 'isTeamMember',
      create: 'isTeamOwner || isTeamAdmin',
      update: 'isTeamOwner || isTeamAdmin',
      delete: 'isTeamOwner || isTeamAdmin',
    },
  },
  logTags: {
    bind: [
      'isValidName',
      'size(newData.name) <= 16',
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'canManage',
      "auth.id in data.ref('team.roles.adminId')",
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
      'size(newData.name) <= 32',
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'canManage',
      "auth.id in data.ref('team.roles.adminId')",
    ],
    allow: {
      view: 'isTeamMember',
      create: 'canManage && isValidName',
      update: 'canManage && isValidName',
      delete: 'canManage',
    },
  },
  profiles: {
    bind: [
      'isValidName',
      'newData.name == null || size(newData.name) <= 32',
      'isAuthenticated',
      'auth.id != null',
      'isTeammate',
      "data.id in data.ref('user.ui.team.roles.user.profile.id')",
      'isProfileOwner',
      "data.ref('user.id') == auth.ref('$user.id')",
    ],
    allow: {
      view: 'isProfileOwner || isTeammate',
      create: 'isAuthenticated && isValidName',
      update: 'isProfileOwner && isValidName',
      delete: 'isProfileOwner',
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
      'canManageRecord',
      "auth.id in data.ref('record.log.team.roles.adminId')",
      'canManageComment',
      "auth.id in data.ref('comment.record.log.team.roles.adminId')",
    ],
    allow: {
      view: 'isRecordTeamMember || isCommentTeamMember',
      create: 'isRecordTeamMember || isCommentTeamMember',
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
      'canManage',
      "auth.id in data.ref('log.team.roles.adminId')",
    ],
    allow: {
      view: '(!isDraft && isTeamMember) || isAuthor',
      create: 'isTeamMember && isValidText',
      update: '(isAuthor || canManage) && isValidText',
      delete: 'isAuthor || canManage',
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
      delete: 'isRoleOwner || isTeamOwner',
    },
  },
  teams: {
    bind: [
      'isValidName',
      'size(newData.name) <= 32',
      'isAuthenticated',
      'auth.id != null',
      'isTeamMember',
      "auth.id in data.ref('roles.user.id')",
      'isTeamOwner',
      `'${Role.Owner}_' + auth.id + '_' + data.id in data.ref('roles.key')`,
      'hasTeamId',
      'data.id == ruleParams.teamId',
    ],
    allow: {
      view: 'isTeamMember || hasTeamId',
      create: 'isAuthenticated && isValidName',
      update: 'isTeamOwner && isValidName',
      delete: 'isTeamOwner',
    },
  },
  ui: {
    allow: {
      $default: "data.ref('user.id') == auth.ref('$user.id')",
    },
  },
} satisfies InstantRules;

export default rules;
