import { i } from '@instantdb/react-native';

// Docs: https://www.instantdb.com/docs/modeling-data
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
    logAuthors: {
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
    subjectLogs: {
      forward: {
        on: 'logs',
        has: 'one',
        label: 'subject',
        onDelete: 'cascade',
        required: true,
      },
      reverse: {
        on: 'subjects',
        has: 'many',
        label: 'logs',
      },
    },
    teamRoles: {
      forward: {
        on: 'roles',
        has: 'one',
        label: 'team',
        onDelete: 'cascade',
        required: true,
      },
      reverse: {
        on: 'teams',
        has: 'many',
        label: 'roles',
      },
    },
    teamSubjects: {
      forward: {
        on: 'subjects',
        has: 'one',
        label: 'team',
        onDelete: 'cascade',
        required: true,
      },
      reverse: {
        on: 'teams',
        has: 'many',
        label: 'subjects',
      },
    },
    uiTeam: {
      forward: {
        on: 'teams',
        has: 'many',
        label: 'ui',
      },
      reverse: {
        on: 'ui',
        has: 'one',
        label: 'team',
        required: true,
      },
    },
    userProfiles: {
      forward: {
        on: 'profiles',
        has: 'one',
        label: 'user',
        onDelete: 'cascade',
        required: true,
      },
      reverse: {
        on: '$users',
        has: 'one',
        label: 'profile',
      },
    },
    userRoles: {
      forward: {
        on: 'roles',
        has: 'one',
        label: 'user',
        onDelete: 'cascade',
        required: true,
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'roles',
      },
    },
    userUi: {
      forward: {
        on: 'ui',
        has: 'one',
        label: 'user',
        onDelete: 'cascade',
        required: true,
      },
      reverse: {
        on: '$users',
        has: 'one',
        label: 'ui',
      },
    },
  },
});

type AppSchema = typeof _schema;
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
