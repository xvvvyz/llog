// https://www.instantdb.com/docs/permissions

import { Role } from '@/enums/roles';
import type { InstantRules } from '@instantdb/react-native';

const rules = {
  $default: {
    allow: {
      $default: `false`,
    },
  },
  $users: {
    allow: {
      view: `auth.id == data.id`,
      create: `false`,
      delete: `false`,
      update: `false`,
    },
  },
  attrs: {
    allow: {
      create: `false`,
    },
  },
  logTags: {
    allow: {
      view: `isTeamMember`,
      create: `(isTeamAdmin || isTeamOwner) && isValidName`,
      update: `(isTeamAdmin || isTeamOwner) && isValidName`,
      delete: `isTeamOwner`,
    },
    bind: [
      `isValidName`,
      `size(newData.name) <= 16`,
      `isTeamMember`,
      `auth.id in data.ref('team.roles.user.id')`,
      `isTeamAdmin`,
      `'${Role.Admin}_' + auth.id in data.ref('team.roles.key')`,
      `isTeamOwner`,
      `'${Role.Owner}_' + auth.id in data.ref('team.roles.key')`,
    ],
  },
  logs: {
    allow: {
      view: `isTeamMember`,
      create: `(isTeamAdmin || isTeamOwner) && isValidName`,
      update: `(isTeamAdmin || isTeamOwner) && isValidName`,
      delete: `isTeamOwner`,
    },
    bind: [
      `isValidName`,
      `size(newData.name) <= 16`,
      `isTeamMember`,
      `auth.id in data.ref('team.roles.user.id')`,
      `isTeamAdmin`,
      `'${Role.Admin}_' + auth.id in data.ref('team.roles.key')`,
      `isTeamOwner`,
      `'${Role.Owner}_' + auth.id in data.ref('team.roles.key')`,
    ],
  },
  profiles: {
    allow: {
      view: `isProfileOwner || isTeammate`,
      create: `isAuthenticated && isValidName`,
      update: `isProfileOwner && isValidName`,
      delete: `isProfileOwner`,
    },
    bind: [
      `isValidName`,
      `newData.name == null || size(newData.name) <= 32`,
      `isAuthenticated`,
      `auth.id != null`,
      `isTeammate`,
      `data.id in data.ref('user.ui.team.roles.user.profile.id')`,
      `isProfileOwner`,
      `data.ref('user.id') == auth.ref('$user.id')`,
    ],
  },
  records: {
    allow: {
      view: `isTeamMember`,
      create: `(isTeamRecorder || isTeamAdmin || isTeamOwner) && isValidText`,
      update: `isAuthor && isValidText`,
      delete: `isAuthor || isTeamAdmin || isTeamOwner`,
    },
    bind: [
      `isValidText`,
      `size(newData.text) <= 10240`,
      `isAuthor`,
      `data.ref('author.user.id') == auth.ref('$user.id')`,
      `isTeamMember`,
      `auth.id in data.ref('log.team.roles.user.id')`,
      `isTeamRecorder`,
      `'${Role.Recorder}_' + auth.id in data.ref('log.team.roles.key')`,
      `isTeamAdmin`,
      `'${Role.Admin}_' + auth.id in data.ref('log.team.roles.key')`,
      `isTeamOwner`,
      `'${Role.Owner}_' + auth.id in data.ref('log.team.roles.key')`,
    ],
  },
  roles: {
    allow: {
      view: `isTeamMember`,
      create: `isFirstRole && isValidRole && isValidUserId && isValidKey`,
      update: `isTeamOwner && isValidRole && isValidUserId && isValidKey`,
      delete: `isRoleOwner || isTeamOwner`,
    },
    bind: [
      `isValidRole`,
      `newData.role in ['${Role.Owner}', '${Role.Admin}', '${Role.Recorder}', '${Role.Viewer}']`,
      `isValidUserId`,
      `newData.userId in data.ref('user.id')`,
      `isValidKey`,
      `newData.key == newData.role + '_' + newData.userId`,
      `isFirstRole`,
      `size(data.ref('team.roles.id')) == 1`,
      `isRoleOwner`,
      `data.ref('user.id') == auth.ref('$user.id')`,
      `isTeamMember`,
      `auth.id in data.ref('team.roles.user.id')`,
      `isTeamOwner`,
      `'${Role.Owner}_' + auth.id in data.ref('team.roles.key')`,
    ],
  },
  teams: {
    allow: {
      view: `isTeamMember || hasTeamId`,
      create: `isAuthenticated && isValidName`,
      update: `isTeamOwner && isValidName`,
      delete: `isTeamOwner`,
    },
    bind: [
      `isValidName`,
      `size(newData.name) <= 32`,
      `isAuthenticated`,
      `auth.id != null`,
      `isTeamMember`,
      `auth.id in data.ref('roles.user.id')`,
      `isTeamOwner`,
      `'${Role.Owner}_' + auth.id in data.ref('roles.key')`,
      `hasTeamId`,
      `data.id == ruleParams.teamId`,
    ],
  },
  ui: {
    allow: {
      $default: `data.ref('user.id') == auth.ref('$user.id')`,
    },
  },
} satisfies InstantRules;

export default rules;
