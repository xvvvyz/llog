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
      teamId: i.string().indexed(),
      text: i.string(),
    }),
    images: i.entity({
      teamId: i.string().optional().indexed(),
      uri: i.string(),
    }),
    invites: i.entity({
      email: i.string().indexed(),
      role: i.string(),
      teamId: i.string().indexed(),
    }),
    logTags: i.entity({
      name: i.string().indexed(),
      order: i.number().indexed(),
      teamId: i.string().indexed(),
    }),
    logs: i.entity({
      color: i.number().indexed(),
      name: i.string().indexed(),
      teamId: i.string().indexed(),
    }),
    profiles: i.entity({
      name: i.string(),
    }),
    reactions: i.entity({
      emoji: i.string().indexed(),
      teamId: i.string().indexed(),
    }),
    records: i.entity({
      date: i.date().indexed(),
      isDraft: i.boolean().indexed(),
      teamId: i.string().indexed(),
      text: i.string().optional(),
    }),
    roles: i.entity({
      key: i.string().unique(),
      role: i.string(),
      teamId: i.string().indexed(),
      userId: i.string(),
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
    commentsReactions: {
      forward: {
        on: 'comments',
        has: 'many',
        label: 'reactions',
      },
      reverse: {
        on: 'reactions',
        has: 'one',
        label: 'comment',
        onDelete: 'cascade',
      },
    },
    teamsInvites: {
      forward: {
        on: 'teams',
        has: 'many',
        label: 'invites',
      },
      reverse: {
        on: 'invites',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
    },
    invitesCreators: {
      forward: {
        on: 'invites',
        has: 'one',
        label: 'creator',
        required: true,
      },
      reverse: {
        on: 'profiles',
        has: 'many',
        label: 'invites',
      },
    },
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
    commentsImages: {
      forward: {
        on: 'comments',
        has: 'many',
        label: 'images',
      },
      reverse: {
        on: 'images',
        has: 'one',
        label: 'comment',
        onDelete: 'cascade',
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
    profilesImages: {
      forward: {
        on: 'profiles',
        has: 'one',
        label: 'image',
      },
      reverse: {
        on: 'images',
        has: 'one',
        label: 'profile',
        onDelete: 'cascade',
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
    reactionsAuthors: {
      forward: {
        on: 'reactions',
        has: 'one',
        label: 'author',
        required: true,
      },
      reverse: {
        on: 'profiles',
        has: 'many',
        label: 'reactions',
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
    recordsReactions: {
      forward: {
        on: 'records',
        has: 'many',
        label: 'reactions',
      },
      reverse: {
        on: 'reactions',
        has: 'one',
        label: 'record',
        onDelete: 'cascade',
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
    recordsImages: {
      forward: {
        on: 'records',
        has: 'many',
        label: 'images',
      },
      reverse: {
        on: 'images',
        has: 'one',
        label: 'record',
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
