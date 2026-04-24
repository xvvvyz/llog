// https://www.instantdb.com/docs/modeling-data

import { i } from '@instantdb/admin';

const schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed().optional(),
      url: i.any().optional(),
    }),
    $users: i.entity({ email: i.string().unique().indexed().optional() }),
    activities: i.entity({
      type: i.string().indexed(),
      date: i.date().indexed(),
      teamId: i.string().indexed(),
      emoji: i.string().optional(),
    }),
    replies: i.entity({
      date: i.date().indexed(),
      isDraft: i.boolean().optional().indexed(),
      teamId: i.string().indexed(),
      text: i.string(),
    }),
    media: i.entity({
      assetKey: i.string().optional(),
      duration: i.number().optional(),
      order: i.number().optional(),
      thumbnailUri: i.string().optional(),
      type: i.string(),
      uri: i.string(),
    }),
    invites: i.entity({
      token: i.string().unique().indexed(),
      role: i.string(),
      teamId: i.string().indexed(),
    }),
    tags: i.entity({
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
      avatarSeedId: i.string().optional(),
      name: i.string(),
    }),
    subscriptions: i.entity({
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
    teams: i.entity({ name: i.string() }),
    ui: i.entity({
      activityLastReadDate: i.date().optional(),
      audioPlaybackRate: i.number().optional(),
      doubleTapEmoji: i.string().optional(),
      logsSortBy: i.string().optional(),
      logsSortDirection: i.string().optional(),
      videoMuted: i.boolean().optional(),
    }),
  },
  links: {
    activitiesActors: {
      forward: { on: 'activities', has: 'one', label: 'actor', required: true },
      reverse: { on: 'profiles', has: 'many', label: 'actorActivities' },
    },
    activitiesReplies: {
      forward: { on: 'activities', has: 'one', label: 'reply' },
      reverse: { on: 'replies', has: 'many', label: 'activities' },
    },
    activitiesLogs: {
      forward: { on: 'activities', has: 'one', label: 'log' },
      reverse: { on: 'logs', has: 'many', label: 'activities' },
    },
    activitiesRecords: {
      forward: { on: 'activities', has: 'one', label: 'record' },
      reverse: { on: 'records', has: 'many', label: 'activities' },
    },
    activitiesTeams: {
      forward: {
        on: 'activities',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
      reverse: { on: 'teams', has: 'many', label: 'activities' },
    },
    reactionsActivities: {
      forward: { on: 'reactions', has: 'one', label: 'activity' },
      reverse: {
        on: 'activities',
        has: 'one',
        label: 'reaction',
        onDelete: 'cascade',
      },
    },
    repliesReactions: {
      forward: { on: 'replies', has: 'many', label: 'reactions' },
      reverse: {
        on: 'reactions',
        has: 'one',
        label: 'reply',
        onDelete: 'cascade',
      },
    },
    teamsInvites: {
      forward: { on: 'teams', has: 'many', label: 'invites' },
      reverse: {
        on: 'invites',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
    },
    invitesLogs: {
      forward: { on: 'invites', has: 'many', label: 'logs' },
      reverse: { on: 'logs', has: 'many', label: 'invites' },
    },
    invitesCreators: {
      forward: { on: 'invites', has: 'one', label: 'creator', required: true },
      reverse: { on: 'profiles', has: 'many', label: 'invites' },
    },
    repliesAuthors: {
      forward: { on: 'replies', has: 'one', label: 'author', required: true },
      reverse: { on: 'profiles', has: 'many', label: 'replies' },
    },
    repliesMedia: {
      forward: { on: 'replies', has: 'many', label: 'media' },
      reverse: { on: 'media', has: 'one', label: 'reply', onDelete: 'cascade' },
    },
    logsRecords: {
      forward: { on: 'logs', has: 'many', label: 'records' },
      reverse: {
        on: 'records',
        has: 'one',
        label: 'log',
        required: true,
        onDelete: 'cascade',
      },
    },
    logsTags: {
      forward: { on: 'logs', has: 'many', label: 'tags' },
      reverse: { on: 'tags', has: 'many', label: 'logs' },
    },
    logsProfiles: {
      forward: { on: 'logs', has: 'many', label: 'profiles' },
      reverse: { on: 'profiles', has: 'many', label: 'logs' },
    },
    profilesMedia: {
      forward: { on: 'profiles', has: 'one', label: 'image' },
      reverse: {
        on: 'media',
        has: 'one',
        label: 'profile',
        onDelete: 'cascade',
      },
    },
    teamsMedia: {
      forward: { on: 'teams', has: 'one', label: 'image' },
      reverse: { on: 'media', has: 'one', label: 'team', onDelete: 'cascade' },
    },
    profilesUsers: {
      forward: {
        on: 'profiles',
        has: 'one',
        label: 'user',
        required: true,
        onDelete: 'cascade',
      },
      reverse: { on: '$users', has: 'one', label: 'profile' },
    },
    subscriptionsUsers: {
      forward: {
        on: 'subscriptions',
        has: 'one',
        label: 'user',
        required: true,
        onDelete: 'cascade',
      },
      reverse: { on: '$users', has: 'many', label: 'subscriptions' },
    },
    reactionsAuthors: {
      forward: { on: 'reactions', has: 'one', label: 'author', required: true },
      reverse: { on: 'profiles', has: 'many', label: 'reactions' },
    },
    recordsAuthors: {
      forward: { on: 'records', has: 'one', label: 'author', required: true },
      reverse: { on: 'profiles', has: 'many', label: 'records' },
    },
    recordsReactions: {
      forward: { on: 'records', has: 'many', label: 'reactions' },
      reverse: {
        on: 'reactions',
        has: 'one',
        label: 'record',
        onDelete: 'cascade',
      },
    },
    recordsReplies: {
      forward: { on: 'records', has: 'many', label: 'replies' },
      reverse: {
        on: 'replies',
        has: 'one',
        label: 'record',
        required: true,
        onDelete: 'cascade',
      },
    },
    recordsMedia: {
      forward: { on: 'records', has: 'many', label: 'media' },
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
      reverse: { on: '$users', has: 'many', label: 'roles' },
    },
    teamsLogs: {
      forward: { on: 'teams', has: 'many', label: 'logs' },
      reverse: {
        on: 'logs',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
    },
    teamsRoles: {
      forward: { on: 'teams', has: 'many', label: 'roles' },
      reverse: {
        on: 'roles',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
    },
    teamsTags: {
      forward: { on: 'teams', has: 'many', label: 'tags' },
      reverse: {
        on: 'tags',
        has: 'one',
        label: 'team',
        required: true,
        onDelete: 'cascade',
      },
    },
    uiTags: {
      forward: { on: 'ui', has: 'many', label: 'tags' },
      reverse: { on: 'tags', has: 'many', label: 'ui' },
    },
    uiTeams: {
      forward: { on: 'ui', has: 'one', label: 'team' },
      reverse: { on: 'teams', has: 'many', label: 'ui' },
    },
    uiUsers: {
      forward: {
        on: 'ui',
        has: 'one',
        label: 'user',
        required: true,
        onDelete: 'cascade',
      },
      reverse: { on: '$users', has: 'one', label: 'ui' },
    },
  },
  rooms: {},
});

export default schema;
