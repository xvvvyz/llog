// https://www.instantdb.com/docs/modeling-data

import { i } from '@instantdb/react';

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed().optional(),
      url: i.any().optional(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    logs: i.entity({
      color: i.string().optional(),
      name: i.string(),
    }),
    profiles: i.entity({
      name: i.string(),
    }),
    records: i.entity({
      date: i.date().indexed(),
      text: i.string(),
    }),
    roles: i.entity({
      role: i.string(),
    }),
    teams: i.entity({
      name: i.string(),
    }),
    ui: i.entity({}),
  },
  links: {
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
    profilesUser: {
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
        label: 'authors',
        required: true,
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'records',
      },
    },
    rolesUser: {
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
    uiTeam: {
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
    uiUser: {
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

// this helps Typescript display better intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
