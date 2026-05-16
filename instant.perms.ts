// https://www.instantdb.com/docs/permissions

import { InstantRules } from '@instantdb/react-native';
import { Role } from './domain/teams/role';
import * as ruleStrings from './permissions/rule-strings';

const tagColorValues = '[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]';
const logNameMaxLength = 32;
const templateTextMaxLength = 10240;

const rules = {
  $default: { allow: { $default: `false` } },
  activities: {
    bind: [
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'hasLog',
      "size(data.ref('log.id')) > 0",
      'isLogMember',
      "auth.id in data.ref('log.profiles.user.id')",
      'canManage',
      ruleStrings.canManageCurrentTeam,
      'hasReaction',
      "size(data.ref('reaction.id')) > 0",
      'isReactionAuthor',
      "data.ref('reaction.author.user.id') == auth.ref('$user.id')",
      'isReactionRecordAuthor',
      "auth.id in data.ref('reaction.record.author.user.id')",
      'isReactionReplyAuthor',
      "auth.id in data.ref('reaction.reply.author.user.id')",
      'isReactionReplyRecordAuthor',
      "auth.id in data.ref('reaction.reply.record.author.user.id')",
      'isReactionRecordTeamMember',
      "auth.id in data.ref('reaction.record.log.team.roles.user.id')",
      'isReactionReplyTeamMember',
      "auth.id in data.ref('reaction.reply.record.log.team.roles.user.id')",
      'canManageReactionRecord',
      ruleStrings.canManageFor('reaction.record.log.team.id'),
      'canManageReactionReply',
      ruleStrings.canManageFor('reaction.reply.record.log.team.id'),
    ],
    allow: {
      view: 'isTeamMember && (!hasLog || canManage || isLogMember)',
      create: 'isTeamMember',
      update: 'false',
      delete: ruleStrings.and(
        'hasReaction',
        ruleStrings.group(
          ruleStrings.or(
            'isReactionAuthor',
            ruleStrings.group(
              ruleStrings.and(
                'isReactionRecordAuthor',
                'isReactionRecordTeamMember'
              )
            ),
            ruleStrings.group(
              ruleStrings.and(
                'isReactionReplyAuthor',
                'isReactionReplyTeamMember'
              )
            ),
            ruleStrings.group(
              ruleStrings.and(
                'isReactionReplyRecordAuthor',
                'isReactionReplyTeamMember'
              )
            ),
            'canManageReactionRecord',
            'canManageReactionReply'
          )
        )
      ),
    },
  },
  $users: {
    bind: ['isTeammate', "data.id in data.ref('ui.team.roles.user.id')"],
    allow: {
      view: 'auth.id == data.id || isTeammate',
      create: 'true',
      delete: 'false',
      update: 'false',
    },
  },
  attrs: { allow: { create: 'false' } },
  replies: {
    bind: [
      'isValidNewText',
      'newData.text == null || size(newData.text) <= 10240',
      'isAuthor',
      "data.ref('author.user.id') == auth.ref('$user.id')",
      'isRecordAuthor',
      "data.ref('record.author.user.id') == auth.ref('$user.id')",
      'onlyModifiesText',
      "request.modifiedFields.all(field, field in ['text'])",
      'onlyPublishesDraft',
      ruleStrings.and(
        "request.modifiedFields.all(field, field in ['isDraft', 'text'])",
        'newData.isDraft == false'
      ),
      'isDraft',
      'data.isDraft == true',
      'isTeamMember',
      "auth.id in data.ref('record.log.team.roles.user.id')",
      'isLogMember',
      "auth.id in data.ref('record.log.profiles.user.id')",
      'canManage',
      ruleStrings.canManageFor('record.log.team.id'),
      'canDeleteOwn',
      'isAuthor && isTeamMember',
      'canDeleteFromOwnRecord',
      'isRecordAuthor && isTeamMember',
    ],
    allow: {
      view: 'isTeamMember && ((!isDraft && (canManage || isLogMember)) || isAuthor)',
      create:
        'isAuthor && isTeamMember && (canManage || isLogMember) && isValidNewText',
      update: ruleStrings.or(
        ruleStrings.group(
          ruleStrings.and(
            'isAuthor',
            'isTeamMember',
            'onlyModifiesText',
            'isValidNewText'
          )
        ),
        ruleStrings.group(
          ruleStrings.and(
            'isAuthor',
            'isTeamMember',
            'isDraft',
            ruleStrings.group(ruleStrings.or('canManage', 'isLogMember')),
            'onlyPublishesDraft',
            'isValidNewText'
          )
        )
      ),
      delete: 'canDeleteOwn || canDeleteFromOwnRecord || canManage',
      link: {
        links: 'auth.id != null',
        reactions: 'auth.id != null',
        activities: 'auth.id != null',
      },
    },
  },
  files: {
    bind: [
      'hasOneLink',
      ruleStrings.hasExactlyOneRef(
        'record.id',
        'reply.id',
        'profile.id',
        'team.id'
      ),
      'isDocument',
      "data.type == 'document'",
      'isValidDocumentName',
      'newData.name != null && size(newData.name) > 0 && size(newData.name) <= 255',
      'onlyModifiesDocumentName',
      "request.modifiedFields.all(field, field in ['name'])",
      'onlyModifiesFileOrder',
      "request.modifiedFields.all(field, field in ['order'])",
      'isProfileOwner',
      "auth.id in data.ref('profile.user.id')",
      'isTeamImageManager',
      ruleStrings.canManageFor('team.id'),
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'isRecordAuthor',
      "auth.id in data.ref('record.author.user.id')",
      'isReplyAuthor',
      "auth.id in data.ref('reply.author.user.id')",
      'isReplyRecordAuthor',
      "auth.id in data.ref('reply.record.author.user.id')",
      'isRecordTeamMember',
      "auth.id in data.ref('record.log.team.roles.user.id')",
      'isReplyTeamMember',
      "auth.id in data.ref('reply.record.log.team.roles.user.id')",
      'isLoglessDraftRecordFile',
      "true in data.ref('record.isDraft') && data.ref('record.log.id') == [] && isRecordAuthor",
      'isRecordLogMember',
      "auth.id in data.ref('record.log.profiles.user.id')",
      'isReplyLogMember',
      "auth.id in data.ref('reply.record.log.profiles.user.id')",
      'canManageRecord',
      ruleStrings.canManageFor('record.log.team.id'),
      'canManageReply',
      ruleStrings.canManageFor('reply.record.log.team.id'),
      'canViewRecordFiles',
      'isRecordTeamMember && (canManageRecord || isRecordLogMember)',
      'canViewReplyFiles',
      'isReplyTeamMember && (canManageReply || isReplyLogMember)',
      'isTeammate',
      "auth.id in data.ref('profile.user.roles.team.roles.user.id')",
    ],
    allow: {
      view: ruleStrings.or(
        'isProfileOwner',
        'isTeammate',
        'isTeamMember',
        'canViewRecordFiles',
        'canViewReplyFiles',
        'isLoglessDraftRecordFile'
      ),
      create: 'hasOneLink && (isProfileOwner || isTeamImageManager)',
      update: ruleStrings.and(
        'hasOneLink',
        ruleStrings.group(
          ruleStrings.or(
            ruleStrings.group(
              ruleStrings.and(
                'isDocument',
                'onlyModifiesDocumentName',
                'isValidDocumentName'
              )
            ),
            'onlyModifiesFileOrder'
          )
        ),
        ruleStrings.group(
          ruleStrings.or(
            ruleStrings.group(
              ruleStrings.and('isRecordAuthor', 'isRecordTeamMember')
            ),
            ruleStrings.group(
              ruleStrings.and('isReplyAuthor', 'isReplyTeamMember')
            ),
            'canManageRecord',
            'canManageReply',
            'isLoglessDraftRecordFile'
          )
        )
      ),
      delete: ruleStrings.or(
        'isProfileOwner',
        'isTeamImageManager',
        ruleStrings.group(
          ruleStrings.and('isRecordAuthor', 'isRecordTeamMember')
        ),
        ruleStrings.group(
          ruleStrings.and('isReplyAuthor', 'isReplyTeamMember')
        ),
        ruleStrings.group(
          ruleStrings.and('isReplyRecordAuthor', 'isReplyTeamMember')
        ),
        'canManageRecord',
        'canManageReply',
        'isLoglessDraftRecordFile'
      ),
    },
  },
  invites: {
    bind: [
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'isTeamOwner',
      ruleStrings.isOwner,
      'isTeamAdmin',
      ruleStrings.isAdmin,
      'canManage',
      'isTeamOwner || isTeamAdmin',
    ],
    allow: {
      view: 'isTeamMember',
      create: 'false',
      update: 'false',
      delete: 'canManage',
    },
  },
  links: {
    bind: [
      'hasOneLink',
      ruleStrings.hasExactlyOneRef('record.id', 'reply.id'),
      'isValidLabel',
      'newData.label != null && size(newData.label) > 0 && size(newData.label) <= 120',
      'isValidUrl',
      'newData.url != null && size(newData.url) > 0 && size(newData.url) <= 2048',
      'isValidTeamId',
      ruleStrings.or(
        "newData.teamId in data.ref('record.log.team.id')",
        "newData.teamId in data.ref('reply.record.log.team.id')"
      ),
      'isValidLoglessDraftRecordTeamId',
      "newData.teamId in data.ref('record.teamId')",
      'hasLoglessDraftRecordTeamId',
      "data.teamId in data.ref('record.teamId')",
      'onlyModifiesLinkDetails',
      "request.modifiedFields.all(field, field in ['label', 'url'])",
      'onlyModifiesLinkOrder',
      "request.modifiedFields.all(field, field in ['order'])",
      'isRecordAuthor',
      "auth.id in data.ref('record.author.user.id')",
      'isReplyAuthor',
      "auth.id in data.ref('reply.author.user.id')",
      'isReplyRecordAuthor',
      "auth.id in data.ref('reply.record.author.user.id')",
      'isRecordTeamMember',
      "auth.id in data.ref('record.log.team.roles.user.id')",
      'isReplyTeamMember',
      "auth.id in data.ref('reply.record.log.team.roles.user.id')",
      'isRecordLogMember',
      "auth.id in data.ref('record.log.profiles.user.id')",
      'isReplyLogMember',
      "auth.id in data.ref('reply.record.log.profiles.user.id')",
      'canManageRecord',
      ruleStrings.canManageFor('record.log.team.id'),
      'canManageReply',
      ruleStrings.canManageFor('reply.record.log.team.id'),
      'canViewRecord',
      'isRecordTeamMember && (canManageRecord || isRecordLogMember)',
      'canViewReply',
      'isReplyTeamMember && (canManageReply || isReplyLogMember)',
      'isLoglessDraftRecordLink',
      "true in data.ref('record.isDraft') && data.ref('record.log.id') == [] && isRecordAuthor",
    ],
    allow: {
      view: ruleStrings.or(
        'canViewRecord',
        'canViewReply',
        'isRecordAuthor',
        'isReplyAuthor',
        ruleStrings.group(
          ruleStrings.and(
            'isLoglessDraftRecordLink',
            'hasLoglessDraftRecordTeamId'
          )
        )
      ),
      create: ruleStrings.and(
        'hasOneLink',
        'isValidLabel',
        'isValidUrl',
        ruleStrings.group(
          ruleStrings.or(
            ruleStrings.group(
              ruleStrings.and(
                'isValidTeamId',
                ruleStrings.group(
                  ruleStrings.or(
                    ruleStrings.group(
                      ruleStrings.and('isRecordAuthor', 'isRecordTeamMember')
                    ),
                    ruleStrings.group(
                      ruleStrings.and('isReplyAuthor', 'isReplyTeamMember')
                    ),
                    'canManageRecord',
                    'canManageReply'
                  )
                )
              )
            ),
            ruleStrings.group(
              ruleStrings.and(
                'isLoglessDraftRecordLink',
                'isValidLoglessDraftRecordTeamId'
              )
            )
          )
        )
      ),
      update: ruleStrings.and(
        ruleStrings.group(
          ruleStrings.or(
            ruleStrings.group(
              ruleStrings.and(
                'onlyModifiesLinkDetails',
                'isValidLabel',
                'isValidUrl'
              )
            ),
            'onlyModifiesLinkOrder'
          )
        ),
        ruleStrings.group(
          ruleStrings.or(
            ruleStrings.group(
              ruleStrings.and(
                'isValidTeamId',
                ruleStrings.group(
                  ruleStrings.or(
                    ruleStrings.group(
                      ruleStrings.and('isRecordAuthor', 'isRecordTeamMember')
                    ),
                    ruleStrings.group(
                      ruleStrings.and('isReplyAuthor', 'isReplyTeamMember')
                    ),
                    'canManageRecord',
                    'canManageReply'
                  )
                )
              )
            ),
            ruleStrings.group(
              ruleStrings.and(
                'isLoglessDraftRecordLink',
                'isValidLoglessDraftRecordTeamId'
              )
            )
          )
        )
      ),
      delete: ruleStrings.or(
        ruleStrings.group(
          ruleStrings.and('isRecordAuthor', 'isRecordTeamMember')
        ),
        ruleStrings.group(
          ruleStrings.and('isReplyAuthor', 'isReplyTeamMember')
        ),
        ruleStrings.group(
          ruleStrings.and('isReplyRecordAuthor', 'isReplyTeamMember')
        ),
        'canManageRecord',
        'canManageReply',
        ruleStrings.group(
          ruleStrings.and(
            'isLoglessDraftRecordLink',
            'hasLoglessDraftRecordTeamId'
          )
        )
      ),
    },
  },
  tags: {
    bind: [
      'isValidName',
      'newData.name != null && size(newData.name) > 0 && size(newData.name) <= 16',
      'isValidType',
      "newData.type in ['log', 'record']",
      'isValidColor',
      ruleStrings.and(
        'newData.color != null',
        "newData.type in ['log', 'record']",
        `newData.color in ${tagColorValues}`
      ),
      'onlyModifiesTagDetails',
      "request.modifiedFields.all(field, field in ['color', 'name', 'order'])",
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'canManage',
      ruleStrings.canManageCurrentTeam,
    ],
    allow: {
      view: 'isTeamMember',
      create: 'canManage && isValidName && isValidType && isValidColor',
      update:
        'canManage && onlyModifiesTagDetails && isValidName && isValidColor',
      delete: 'canManage',
    },
  },
  templates: {
    bind: [
      'isValidText',
      `newData.text != null && size(newData.text) > 0 && size(newData.text) <= ${templateTextMaxLength}`,
      'isValidOrder',
      'newData.order != null',
      'isValidTeamId',
      "newData.teamId in data.ref('log.team.id')",
      'onlyModifiesTemplateDetails',
      "request.modifiedFields.all(field, field in ['order', 'text'])",
      'isTeamMember',
      "auth.id in data.ref('log.team.roles.user.id')",
      'isLogMember',
      "auth.id in data.ref('log.profiles.user.id')",
      'canManage',
      ruleStrings.canManageFor('log.team.id'),
      'hasOnlyRecordTags',
      "data.ref('tags.type').all(type, type == 'record')",
      'hasSameTeamTags',
      "data.ref('tags.teamId').all(teamId, teamId == data.teamId)",
      'templateTagsBelongToTemplateLog',
      "data.ref('tags.logs.id').all(logId, logId in data.ref('log.id'))",
    ],
    allow: {
      view: 'isTeamMember && (canManage || isLogMember)',
      create: 'canManage && isValidText && isValidOrder && isValidTeamId',
      update:
        'canManage && onlyModifiesTemplateDetails && isValidText && isValidOrder && isValidTeamId',
      delete: 'canManage',
      link: {
        tags: ruleStrings.and(
          'canManage',
          'hasOnlyRecordTags',
          'hasSameTeamTags',
          'templateTagsBelongToTemplateLog'
        ),
      },
      unlink: { tags: 'canManage' },
    },
  },
  logs: {
    bind: [
      'isValidName',
      `newData.name == null || size(newData.name) <= ${logNameMaxLength}`,
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'isLogMember',
      "auth.id in data.ref('profiles.user.id')",
      'canManage',
      ruleStrings.canManageCurrentTeam,
    ],
    allow: {
      view: 'isTeamMember && (canManage || isLogMember)',
      create: 'canManage && isValidName',
      update: 'canManage && isValidName',
      delete: 'canManage',
      link: { records: 'auth.id != null', activities: 'auth.id != null' },
    },
  },
  profiles: {
    bind: [
      'isValidName',
      'newData.name == null || size(newData.name) <= 32',
      'isAuthenticated',
      'auth.id != null',
      'isProfileOwner',
      "data.ref('user.id') == auth.ref('$user.id')",
      'hasSharedLogAccess',
      "auth.id != null && auth.id in data.ref('logs.profiles.user.id')",
      'hasManagedTeamOwnerAccess',
      ruleStrings.isOwnerFor('user.roles.team.id'),
      'hasManagedTeamAdminAccess',
      ruleStrings.isAdminFor('user.roles.team.id'),
      'hasManagedTeamAccess',
      'hasManagedTeamOwnerAccess || hasManagedTeamAdminAccess',
    ],
    allow: {
      view: 'isProfileOwner || hasSharedLogAccess || hasManagedTeamAccess',
      create: 'isAuthenticated && isValidName',
      update: 'isProfileOwner && isValidName',
      delete: 'isProfileOwner',
      link: {
        records: 'auth.id != null',
        replies: 'auth.id != null',
        reactions: 'auth.id != null',
        actorActivities: 'auth.id != null',
      },
    },
  },
  subscriptions: {
    bind: ['isOwner', "data.ref('user.id') == auth.ref('$user.id')"],
    allow: {
      view: 'isOwner',
      create: 'isOwner',
      update: 'isOwner',
      delete: 'isOwner',
    },
  },
  reactions: {
    bind: [
      'isAuthor',
      "data.ref('author.user.id') == auth.ref('$user.id')",
      'isRecordAuthor',
      "auth.id in data.ref('record.author.user.id')",
      'isReplyAuthor',
      "auth.id in data.ref('reply.author.user.id')",
      'isReplyRecordAuthor',
      "auth.id in data.ref('reply.record.author.user.id')",
      'isRecordTeamMember',
      "auth.id in data.ref('record.log.team.roles.user.id')",
      'isReplyTeamMember',
      "auth.id in data.ref('reply.record.log.team.roles.user.id')",
      'isRecordLogMember',
      "auth.id in data.ref('record.log.profiles.user.id')",
      'isReplyLogMember',
      "auth.id in data.ref('reply.record.log.profiles.user.id')",
      'canManageRecord',
      ruleStrings.canManageFor('record.log.team.id'),
      'canManageReply',
      ruleStrings.canManageFor('reply.record.log.team.id'),
      'canViewRecord',
      'isRecordTeamMember && (canManageRecord || isRecordLogMember)',
      'canViewReply',
      'isReplyTeamMember && (canManageReply || isReplyLogMember)',
    ],
    allow: {
      view: 'canViewRecord || canViewReply',
      create: 'isAuthor && (canViewRecord || canViewReply)',
      delete: ruleStrings.or(
        'isAuthor',
        ruleStrings.group(
          ruleStrings.and('isRecordAuthor', 'isRecordTeamMember')
        ),
        ruleStrings.group(
          ruleStrings.and('isReplyAuthor', 'isReplyTeamMember')
        ),
        ruleStrings.group(
          ruleStrings.and('isReplyRecordAuthor', 'isReplyTeamMember')
        ),
        'canManageRecord',
        'canManageReply'
      ),
    },
  },
  records: {
    bind: [
      'isValidNewText',
      'newData.text == null || size(newData.text) <= 10240',
      'isAuthor',
      "data.ref('author.user.id') == auth.ref('$user.id')",
      'onlyModifiesText',
      "request.modifiedFields.all(field, field in ['text'])",
      'onlyModifiesTextAndTags',
      "request.modifiedFields.all(field, field in ['text', 'tags'])",
      'onlyModifiesPinnedState',
      "request.modifiedFields.all(field, field in ['isPinned'])",
      'onlyPublishesDraft',
      ruleStrings.and(
        "request.modifiedFields.all(field, field in ['isDraft', 'text'])",
        'newData.isDraft == false'
      ),
      'isDraft',
      'data.isDraft == true',
      'hasLog',
      "size(data.ref('log.id')) > 0",
      'isAuthorOwnedLoglessDraft',
      'isAuthor && isDraft && !hasLog',
      'isTeamMember',
      "auth.id in data.ref('log.team.roles.user.id')",
      'isLogMember',
      "auth.id in data.ref('log.profiles.user.id')",
      'canManage',
      ruleStrings.canManageFor('log.team.id'),
      'canDeleteOwn',
      'isAuthor && isTeamMember',
      'isTeamMemberByTeamId',
      "data.teamId in auth.ref('$user.roles.team.id')",
      'canManageByTeamId',
      ruleStrings.canManageAuthTeam('data.teamId'),
      'canManageRecordTags',
      'isTeamMemberByTeamId && (isAuthor || canManageByTeamId)',
      'hasOnlyRecordTags',
      "data.ref('tags.type').all(type, type == 'record')",
      'hasSameTeamTags',
      "data.ref('tags.teamId').all(teamId, teamId == data.teamId)",
      'recordTagsBelongToRecordLog',
      "!hasLog || data.ref('tags.logs.id').all(logId, logId in data.ref('log.id'))",
    ],
    allow: {
      view: ruleStrings.or(
        ruleStrings.group(
          ruleStrings.and(
            'isTeamMember',
            ruleStrings.group(
              ruleStrings.or(
                ruleStrings.group(
                  ruleStrings.and(
                    '!isDraft',
                    ruleStrings.group(
                      ruleStrings.or('canManage', 'isLogMember')
                    )
                  )
                ),
                'isAuthor'
              )
            )
          )
        ),
        'isAuthorOwnedLoglessDraft'
      ),
      create:
        'isAuthor && isTeamMember && (canManage || isLogMember) && isValidNewText',
      update: ruleStrings.or(
        ruleStrings.group(
          ruleStrings.and(
            'isAuthor',
            'isTeamMember',
            'onlyModifiesText',
            'isValidNewText'
          )
        ),
        ruleStrings.group(
          ruleStrings.and(
            'isAuthor',
            'isTeamMember',
            'isDraft',
            ruleStrings.group(ruleStrings.or('canManage', 'isLogMember')),
            'onlyPublishesDraft',
            'isValidNewText'
          )
        ),
        ruleStrings.group(
          ruleStrings.and('canManage', 'onlyModifiesPinnedState')
        ),
        ruleStrings.group(
          ruleStrings.and(
            'isAuthorOwnedLoglessDraft',
            'canManageByTeamId',
            'onlyModifiesPinnedState'
          )
        ),
        ruleStrings.group(
          ruleStrings.and(
            'isAuthorOwnedLoglessDraft',
            'onlyModifiesText',
            'isValidNewText'
          )
        ),
        ruleStrings.group(
          ruleStrings.and(
            'isDraft',
            'canManageRecordTags',
            'onlyModifiesTextAndTags',
            'isValidNewText',
            'hasOnlyRecordTags',
            'hasSameTeamTags',
            'recordTagsBelongToRecordLog'
          )
        )
      ),
      delete: 'canDeleteOwn || canManage || isAuthorOwnedLoglessDraft',
      link: {
        links: 'auth.id != null',
        replies: 'auth.id != null',
        reactions: 'auth.id != null',
        activities: 'auth.id != null',
        tags: ruleStrings.and(
          'canManageRecordTags',
          'hasOnlyRecordTags',
          'hasSameTeamTags',
          'recordTagsBelongToRecordLog'
        ),
      },
      unlink: { tags: 'canManageRecordTags' },
    },
  },
  roles: {
    bind: [
      'isValidRole',
      `newData.role in ['${Role.Owner}', '${Role.Admin}', '${Role.Member}']`,
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
      ruleStrings.isAdmin,
      'isTeamOwner',
      ruleStrings.isOwner,
    ],
    allow: {
      view: 'isTeamMember',
      create: ruleStrings.and(
        ruleStrings.group(
          ruleStrings.or('isFirstRole', 'isTeamOwner', 'isTeamAdmin')
        ),
        'isValidRole',
        'isValidUserId',
        'isValidTeamId',
        'isValidKey'
      ),
      update: ruleStrings.and(
        ruleStrings.group(
          ruleStrings.or(
            'isTeamOwner',
            ruleStrings.group(
              ruleStrings.and(
                'isTeamAdmin',
                '!isRoleOwner',
                ruleStrings.group(
                  ruleStrings.or(
                    ruleStrings.group(
                      ruleStrings.and(
                        `data.role == '${Role.Member}'`,
                        `newData.role == '${Role.Admin}'`
                      )
                    ),
                    ruleStrings.group(
                      ruleStrings.and(
                        `data.role == '${Role.Admin}'`,
                        `newData.role == '${Role.Member}'`
                      )
                    )
                  )
                )
              )
            )
          )
        ),
        'isValidRole',
        'isValidUserId',
        'isValidTeamId',
        'isValidKey'
      ),
      delete: `isRoleOwner || isTeamOwner || (isTeamAdmin && data.role == '${Role.Member}')`,
    },
  },
  teams: {
    bind: [
      'isValidName',
      'newData.name == null || size(newData.name) <= 32',
      'isAuthenticated',
      'auth.id != null',
      'isTeamMember',
      "auth.id in data.ref('roles.user.id')",
      'isTeamOwner',
      ruleStrings.authRoleIn(Role.Owner, 'data.id', "data.ref('roles.key')"),
      'isTeamAdmin',
      ruleStrings.authRoleIn(Role.Admin, 'data.id', "data.ref('roles.key')"),
      'canManage',
      'isTeamOwner || isTeamAdmin',
      'hasTeamId',
      'data.id == ruleParams.teamId',
    ],
    allow: {
      view: 'isTeamMember || hasTeamId',
      create: 'isAuthenticated && isValidName',
      update: 'canManage && isValidName',
      delete: 'isTeamOwner',
      link: { activities: 'auth.id != null' },
    },
  },
  ui: { allow: { $default: "data.ref('user.id') == auth.ref('$user.id')" } },
} satisfies InstantRules;

export default rules;
