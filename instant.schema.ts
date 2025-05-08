import { i } from '@instantdb/react-native';

// https://www.instantdb.com/docs/modeling-data
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
      date: i.date(),
      text: i.string(),
    }),
    profiles: i.entity({
      name: i.string(),
    }),
    roles: i.entity({
      role: i.string(),
    }),
    subjects: i.entity({
      name: i.string(),
    }),
    teams: i.entity({
      name: i.string(),
    }),
    ui: i.entity({}),
  },
  links: {
    logsAuthors: {
      forward: {
        on: 'logs',
        has: 'many',
        label: 'authors',
        required: true,
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'logs',
      },
    },
    logsSubject: {
      forward: {
        on: 'logs',
        has: 'one',
        label: 'subject',
        required: true,
        onDelete: 'cascade',
      },
      reverse: {
        on: 'subjects',
        has: 'many',
        label: 'logs',
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
    rolesTeam: {
      forward: {
        on: 'roles',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
      reverse: {
        on: 'teams',
        has: 'many',
        label: 'roles',
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
    subjectsTeam: {
      forward: {
        on: 'subjects',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
      reverse: {
        on: 'teams',
        has: 'many',
        label: 'subjects',
      },
    },
    teamsUi: {
      forward: {
        on: 'teams',
        has: 'many',
        label: 'ui',
      },
      reverse: {
        on: 'ui',
        has: 'one',
        label: 'team',
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

type AppSchema = typeof _schema;
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
