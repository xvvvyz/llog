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
    analyses: i.entity({
      analysisSpec: i.any(),
      jobType: i.string(),
      tweakPrompt: i.string().optional(),
    }),
    cards: i.entity({
      blueprint: i.any().optional(),
      error: i.string().optional(),
      generationRequestedAt: i.date().optional(),
      isGenerating: i.boolean().optional(),
      lastGeneratedAt: i.date().optional(),
      logId: i.string().indexed(),
      order: i.number().indexed(),
      output: i.any().optional(),
      prompt: i.string(),
      sourceFingerprint: i.string().optional(),
      teamId: i.string().indexed(),
      title: i.string().indexed(),
      type: i.string().indexed(),
    }),
    facts: i.entity({ data: i.any(), key: i.string().unique().indexed() }),
    replies: i.entity({
      date: i.date().indexed(),
      isDraft: i.boolean().optional().indexed(),
      teamId: i.string().indexed(),
      text: i.string(),
    }),
    files: i.entity({
      audd: i.any().optional(),
      assetKey: i.string().optional(),
      duration: i.number().optional(),
      identificationRequestedAt: i.date().optional(),
      isIdentifying: i.boolean().optional(),
      isTranscribing: i.boolean().optional(),
      mimeType: i.string().optional(),
      name: i.string().optional(),
      order: i.number().indexed(),
      size: i.number().optional(),
      thumbnailUri: i.string().optional(),
      tracks: i.any().optional(),
      transcriptionRequestedAt: i.date().optional(),
      transcript: i.any().optional(),
      type: i.string(),
      uri: i.string().optional(),
    }),
    invites: i.entity({
      key: i.string().unique().indexed(),
      role: i.string(),
      teamId: i.string().indexed(),
      token: i.string().unique().indexed(),
    }),
    links: i.entity({
      label: i.string().indexed(),
      order: i.number().indexed(),
      teamId: i.string().indexed(),
      url: i.string(),
    }),
    tags: i.entity({
      color: i.number(),
      name: i.string().indexed(),
      order: i.number().indexed(),
      teamId: i.string().indexed(),
      type: i.string().indexed(),
    }),
    templates: i.entity({
      logId: i.string().indexed().optional(),
      order: i.number().indexed(),
      teamId: i.string().indexed(),
      text: i.string(),
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
      authorId: i.string().indexed().optional(),
      date: i.date().indexed(),
      isPinned: i.boolean().optional().indexed(),
      logId: i.string().indexed().optional(),
      status: i.string().indexed(),
      teamId: i.string().indexed(),
      text: i.string().optional(),
    }),
    roles: i.entity({
      key: i.string().unique(),
      role: i.string(),
      teamId: i.string().indexed(),
      userId: i.string(),
    }),
    teams: i.entity({ name: i.string().indexed() }),
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
    repliesLinks: {
      forward: { on: 'replies', has: 'many', label: 'links' },
      reverse: { on: 'links', has: 'one', label: 'reply', onDelete: 'cascade' },
    },
    repliesAuthors: {
      forward: { on: 'replies', has: 'one', label: 'author', required: true },
      reverse: { on: 'profiles', has: 'many', label: 'replies' },
    },
    repliesFiles: {
      forward: { on: 'replies', has: 'many', label: 'files' },
      reverse: { on: 'files', has: 'one', label: 'reply', onDelete: 'cascade' },
    },
    logsRecords: {
      forward: { on: 'logs', has: 'many', label: 'records' },
      reverse: { on: 'records', has: 'one', label: 'log', onDelete: 'cascade' },
    },
    logsCards: {
      forward: { on: 'logs', has: 'many', label: 'cards' },
      reverse: {
        on: 'cards',
        has: 'one',
        label: 'log',
        required: true,
        onDelete: 'cascade',
      },
    },
    cardsTags: {
      forward: { on: 'cards', has: 'many', label: 'tags' },
      reverse: { on: 'tags', has: 'many', label: 'cards' },
    },
    cardsAnalyses: {
      forward: { on: 'cards', has: 'many', label: 'analyses' },
      reverse: {
        on: 'analyses',
        has: 'one',
        label: 'card',
        required: true,
        onDelete: 'cascade',
      },
    },
    cardsFacts: {
      forward: { on: 'cards', has: 'many', label: 'facts' },
      reverse: {
        on: 'facts',
        has: 'one',
        label: 'card',
        required: true,
        onDelete: 'cascade',
      },
    },
    logsTags: {
      forward: { on: 'logs', has: 'many', label: 'tags' },
      reverse: { on: 'tags', has: 'many', label: 'logs' },
    },
    logsTemplates: {
      forward: { on: 'logs', has: 'many', label: 'templates' },
      reverse: {
        on: 'templates',
        has: 'one',
        label: 'log',
        required: true,
        onDelete: 'cascade',
      },
    },
    templatesTags: {
      forward: { on: 'templates', has: 'many', label: 'tags' },
      reverse: { on: 'tags', has: 'many', label: 'templates' },
    },
    recordsTags: {
      forward: { on: 'records', has: 'many', label: 'tags' },
      reverse: { on: 'tags', has: 'many', label: 'records' },
    },
    logsProfiles: {
      forward: { on: 'logs', has: 'many', label: 'profiles' },
      reverse: { on: 'profiles', has: 'many', label: 'logs' },
    },
    profilesFiles: {
      forward: { on: 'profiles', has: 'one', label: 'image' },
      reverse: {
        on: 'files',
        has: 'one',
        label: 'profile',
        onDelete: 'cascade',
      },
    },
    teamsFiles: {
      forward: { on: 'teams', has: 'one', label: 'image' },
      reverse: { on: 'files', has: 'one', label: 'team', onDelete: 'cascade' },
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
    recordsLinks: {
      forward: { on: 'records', has: 'many', label: 'links' },
      reverse: {
        on: 'links',
        has: 'one',
        label: 'record',
        onDelete: 'cascade',
      },
    },
    recordsFacts: {
      forward: { on: 'records', has: 'many', label: 'facts' },
      reverse: {
        on: 'facts',
        has: 'one',
        label: 'record',
        required: true,
        onDelete: 'cascade',
      },
    },
    recordsFiles: {
      forward: { on: 'records', has: 'many', label: 'files' },
      reverse: {
        on: 'files',
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
    teamsCards: {
      forward: { on: 'teams', has: 'many', label: 'cards' },
      reverse: {
        on: 'cards',
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
