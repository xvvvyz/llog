// https://www.instantdb.com/docs/modeling-data

import { i } from '@instantdb/react';

const schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed().optional(),
      url: i.any().optional(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    comments: i.entity({
      date: i.date().indexed(),
      text: i.string(),
    }),
    logTags: i.entity({
      name: i.string(),
      order: i.number().indexed(),
    }),
    logs: i.entity({
      color: i.number().indexed(),
      name: i.string().indexed(),
    }),
    profiles: i.entity({
      avatar: i.string().optional(),
      name: i.string(),
    }),
    records: i.entity({
      date: i.date().indexed(),
      text: i.string(),
    }),
    roles: i.entity({
      key: i.string().unique(),
      role: i.string(),
      userId: i.string(),
    }),
    rules: i.entity({
      prompt: i.string(),
    }),
    teams: i.entity({
      name: i.string(),
    }),
    ui: i.entity({
      logsSortBy: i.string().optional(),
      logsSortDirection: i.string().optional(),
    }),
  },
  links: {
    commentsAuthors: {
      forward: {
        on: 'comments',
        has: 'one',
        label: 'author',
        required: true,
      },
      reverse: {
        on: 'profiles',
        has: 'many',
        label: 'comments',
      },
    },
    logsRecords: {
      forward: {
        on: 'logs',
        has: 'many',
        label: 'records',
      },
      reverse: {
        on: 'records',
        has: 'one',
        label: 'log',
        required: true,
        onDelete: 'cascade',
      },
    },
    logsLogTags: {
      forward: {
        on: 'logs',
        has: 'many',
        label: 'logTags',
      },
      reverse: {
        on: 'logTags',
        has: 'many',
        label: 'logs',
      },
    },
    profilesUsers: {
      forward: {
        on: 'profiles',
        has: 'one',
        label: 'user',
        required: true,
        onDelete: 'cascade',
      },
      reverse: {
        on: '$users',
        has: 'one',
        label: 'profile',
      },
    },
    recordsAuthors: {
      forward: {
        on: 'records',
        has: 'one',
        label: 'author',
        required: true,
      },
      reverse: {
        on: 'profiles',
        has: 'many',
        label: 'records',
      },
    },
    recordsComments: {
      forward: {
        on: 'records',
        has: 'many',
        label: 'comments',
      },
      reverse: {
        on: 'comments',
        has: 'one',
        label: 'record',
        required: true,
        onDelete: 'cascade',
      },
    },
    rolesUsers: {
      forward: {
        on: 'roles',
        has: 'one',
        label: 'user',
        required: true,
        onDelete: 'cascade',
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'roles',
      },
    },
    rulesAuthors: {
      forward: {
        on: 'rules',
        has: 'one',
        label: 'author',
        required: true,
      },
      reverse: {
        on: 'profiles',
        has: 'many',
        label: 'rules',
      },
    },
    teamsLogs: {
      forward: {
        on: 'teams',
        has: 'many',
        label: 'logs',
      },
      reverse: {
        on: 'logs',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
    },
    teamsRoles: {
      forward: {
        on: 'teams',
        has: 'many',
        label: 'roles',
      },
      reverse: {
        on: 'roles',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
    },
    teamsLogTags: {
      forward: {
        on: 'teams',
        has: 'many',
        label: 'logTags',
      },
      reverse: {
        on: 'logTags',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
    },
    teamsRules: {
      forward: {
        on: 'teams',
        has: 'many',
        label: 'rules',
      },
      reverse: {
        on: 'rules',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
    },
    uiLogTags: {
      forward: {
        on: 'ui',
        has: 'many',
        label: 'logTags',
      },
      reverse: {
        on: 'logTags',
        has: 'many',
        label: 'ui',
      },
    },
    uiTeams: {
      forward: {
        on: 'ui',
        has: 'one',
        label: 'team',
      },
      reverse: {
        on: 'teams',
        has: 'many',
        label: 'ui',
      },
    },
    uiUsers: {
      forward: {
        on: 'ui',
        has: 'one',
        label: 'user',
        required: true,
        onDelete: 'cascade',
      },
      reverse: {
        on: '$users',
        has: 'one',
        label: 'ui',
      },
    },
  },
  rooms: {},
});

export default schema;
