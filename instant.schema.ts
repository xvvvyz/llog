// https://www.instantdb.com/docs/modeling-data

import { i } from '@instantdb/admin';

const schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed().optional(),
      url: i.any().optional(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    activities: i.entity({
      type: i.string().indexed(),
      date: i.date().indexed(),
      teamId: i.string().indexed(),
      emoji: i.string().optional(),
    }),
    comments: i.entity({
      date: i.date().indexed(),
      isDraft: i.boolean().optional().indexed(),
      teamId: i.string().indexed(),
      text: i.string(),
    }),
    media: i.entity({
      duration: i.number().optional(),
      order: i.number().optional(),
      teamId: i.string().optional().indexed(),
      previewUri: i.string().optional(),
      type: i.string(),
      uri: i.string(),
    }),
    inviteLinks: i.entity({
      token: i.string().unique().indexed(),
      role: i.string(),
      teamId: i.string().indexed(),
      expiresAt: i.number().optional(),
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
    pushSubscriptions: i.entity({
      endpoint: i.string().unique().indexed(),
      lastSeenAt: i.date().optional(),
      subscription: i.any(),
    }),
    reactions: i.entity({
      emoji: i.string().indexed(),
      teamId: i.string().indexed(),
    }),
    records: i.entity({
      date: i.date().indexed(),
      isDraft: i.boolean().indexed(),
      isPinned: i.boolean().optional().indexed(),
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
      activityLastReadDate: i.date().optional(),
      doubleTapEmoji: i.string().optional(),
      logsSortBy: i.string().optional(),
      logsSortDirection: i.string().optional(),
      videoMuted: i.boolean().optional(),
    }),
  },
  links: {
    activitiesActors: {
      forward: {
        on: 'activities',
        has: 'one',
        label: 'actor',
        required: true,
      },
      reverse: {
        on: 'profiles',
        has: 'many',
        label: 'actorActivities',
      },
    },
    activitiesComments: {
      forward: {
        on: 'activities',
        has: 'one',
        label: 'comment',
      },
      reverse: {
        on: 'comments',
        has: 'many',
        label: 'activities',
      },
    },
    activitiesLogs: {
      forward: {
        on: 'activities',
        has: 'one',
        label: 'log',
      },
      reverse: {
        on: 'logs',
        has: 'many',
        label: 'activities',
      },
    },
    activitiesRecords: {
      forward: {
        on: 'activities',
        has: 'one',
        label: 'record',
      },
      reverse: {
        on: 'records',
        has: 'many',
        label: 'activities',
      },
    },
    activitiesTeams: {
      forward: {
        on: 'activities',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
      reverse: {
        on: 'teams',
        has: 'many',
        label: 'activities',
      },
    },
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
    teamsInviteLinks: {
      forward: {
        on: 'teams',
        has: 'many',
        label: 'inviteLinks',
      },
      reverse: {
        on: 'inviteLinks',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
    },
    inviteLinksLogs: {
      forward: {
        on: 'inviteLinks',
        has: 'many',
        label: 'logs',
      },
      reverse: {
        on: 'logs',
        has: 'many',
        label: 'inviteLinks',
      },
    },
    inviteLinksCreators: {
      forward: {
        on: 'inviteLinks',
        has: 'one',
        label: 'creator',
        required: true,
      },
      reverse: {
        on: 'profiles',
        has: 'many',
        label: 'inviteLinks',
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
    commentsMedia: {
      forward: {
        on: 'comments',
        has: 'many',
        label: 'media',
      },
      reverse: {
        on: 'media',
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
    logsProfiles: {
      forward: {
        on: 'logs',
        has: 'many',
        label: 'profiles',
      },
      reverse: {
        on: 'profiles',
        has: 'many',
        label: 'logs',
      },
    },
    profilesMedia: {
      forward: {
        on: 'profiles',
        has: 'one',
        label: 'image',
      },
      reverse: {
        on: 'media',
        has: 'one',
        label: 'profile',
        onDelete: 'cascade',
      },
    },
    teamsMedia: {
      forward: {
        on: 'teams',
        has: 'one',
        label: 'image',
      },
      reverse: {
        on: 'media',
        has: 'one',
        label: 'team',
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
    pushSubscriptionsUsers: {
      forward: {
        on: 'pushSubscriptions',
        has: 'one',
        label: 'user',
        required: true,
        onDelete: 'cascade',
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'pushSubscriptions',
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
    recordsMedia: {
      forward: {
        on: 'records',
        has: 'many',
        label: 'media',
      },
      reverse: {
        on: 'media',
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
