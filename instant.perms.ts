// https://www.instantdb.com/docs/permissions

import { InstantRules } from '@instantdb/react-native';
import { Role } from './domain/teams/role';
import * as ruleStrings from './instant.perms.rules';

const tagColorValues = '[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]';
const logNameMaxLength = 32;
const templateTextMaxLength = 10240;
const recordIsAuthor = "auth.id in data.ref('author.user.id')";
const recordIsDraft = 'data.isDraft == true';
const recordHasLog = "size(data.ref('log.id')) > 0";
const recordHasNoLog = "size(data.ref('log.id')) == 0";
const recordIsTeamMember = "auth.id in data.ref('log.team.roles.user.id')";
const recordIsLogMember = "auth.id in data.ref('log.profiles.user.id')";
const recordCanManage = ruleStrings.canManageFor('log.team.id');

const recordIsTeamMemberByTeamId =
  "data.teamId in auth.ref('$user.roles.team.id')";

const recordCanManageByTeamId = ruleStrings.canManageAuthTeam('data.teamId');

const recordIsAuthorOwnedLoglessDraft = ruleStrings.and(
  recordIsAuthor,
  recordIsDraft,
  recordHasNoLog
);

const recordCanManageRecordTags = ruleStrings.and(
  recordIsTeamMemberByTeamId,
  ruleStrings.group(ruleStrings.or(recordIsAuthor, recordCanManageByTeamId))
);

const recordHasOnlyRecordTags =
  "data.ref('tags.type').all(type, type == 'record')";

const recordHasSameTeamTags =
  "data.ref('tags.teamId').all(teamId, teamId == data.teamId)";

const recordTagsBelongToRecordLog = ruleStrings.or(
  recordHasNoLog,
  "data.ref('tags.logs.id').all(logId, logId in data.ref('log.id'))"
);

const recordCanLinkContent = ruleStrings.or(
  recordIsAuthorOwnedLoglessDraft,
  ruleStrings.group(
    ruleStrings.and(
      recordIsTeamMember,
      ruleStrings.group(
        ruleStrings.or(recordIsAuthor, recordCanManage, recordIsLogMember)
      )
    )
  )
);

const logIsTeamMember = "auth.id in data.ref('team.roles.user.id')";
const logIsLogMember = "auth.id in data.ref('profiles.user.id')";
const logHasInviteToken = "ruleParams.inviteToken in data.ref('invites.token')";
const logIsLinkedProfileOwner = 'linkedData.user == auth.id';
const logCanManage = ruleStrings.canManageCurrentTeam;

const logCanLinkContent = ruleStrings.and(
  logIsTeamMember,
  ruleStrings.group(ruleStrings.or(logCanManage, logIsLogMember))
);

const logCanLinkProfiles = ruleStrings.or(
  logCanManage,
  ruleStrings.group(ruleStrings.and(logHasInviteToken, logIsLinkedProfileOwner))
);

const teamIsTeamMember = "auth.id in data.ref('roles.user.id')";

const activityIsTeamMemberByTeamId =
  "data.teamId in auth.ref('$user.roles.team.id')";

const activityHasNoLog = "size(data.ref('log.id')) == 0";
const activityIsLogMember = "auth.id in data.ref('log.profiles.user.id')";
const activityCanManageByTeamId = ruleStrings.canManageAuthTeam('data.teamId');
const activityHasReaction = "size(data.ref('reaction.id')) > 0";

const activityIsReactionAuthor =
  "auth.id in data.ref('reaction.author.user.id')";

const activityIsReactionRecordAuthor =
  "auth.id in data.ref('reaction.record.author.user.id')";

const activityIsReactionReplyAuthor =
  "auth.id in data.ref('reaction.reply.author.user.id')";

const activityIsReactionReplyRecordAuthor =
  "auth.id in data.ref('reaction.reply.record.author.user.id')";

const activityIsReactionRecordTeamMember =
  "auth.id in data.ref('reaction.record.log.team.roles.user.id')";

const activityIsReactionReplyTeamMember =
  "auth.id in data.ref('reaction.reply.record.log.team.roles.user.id')";

const activityCanManageReactionRecord = ruleStrings.canManageFor(
  'reaction.record.log.team.id'
);

const activityCanManageReactionReply = ruleStrings.canManageFor(
  'reaction.reply.record.log.team.id'
);

const activityCanView = ruleStrings.and(
  activityIsTeamMemberByTeamId,
  ruleStrings.group(
    ruleStrings.or(
      activityHasNoLog,
      activityCanManageByTeamId,
      activityIsLogMember
    )
  )
);

const activityCanDeleteReaction = ruleStrings.and(
  activityHasReaction,
  ruleStrings.group(
    ruleStrings.or(
      activityIsReactionAuthor,
      ruleStrings.group(
        ruleStrings.and(
          activityIsReactionRecordAuthor,
          activityIsReactionRecordTeamMember
        )
      ),
      ruleStrings.group(
        ruleStrings.and(
          activityIsReactionReplyAuthor,
          activityIsReactionReplyTeamMember
        )
      ),
      ruleStrings.group(
        ruleStrings.and(
          activityIsReactionReplyRecordAuthor,
          activityIsReactionReplyTeamMember
        )
      ),
      activityCanManageReactionRecord,
      activityCanManageReactionReply
    )
  )
);

const activityCanDelete = ruleStrings.or(
  activityCanDeleteReaction,
  activityCanManageByTeamId
);

const activityCanLinkTeam = ruleStrings.and(
  activityIsTeamMemberByTeamId,
  'linkedData.id == data.teamId'
);

const activityCanLinkSameTeamContent = ruleStrings.and(
  activityIsTeamMemberByTeamId,
  'linkedData.teamId == data.teamId'
);

const activityCanLinkLog = ruleStrings.and(
  activityCanLinkSameTeamContent,
  ruleStrings.group(
    ruleStrings.or(
      activityCanManageByTeamId,
      "auth.id in linkedData.ref('profiles.user.id')"
    )
  )
);

const activityCanLinkRecord = ruleStrings.and(
  activityCanLinkSameTeamContent,
  ruleStrings.group(
    ruleStrings.or(
      activityCanManageByTeamId,
      "auth.id in linkedData.ref('author.user.id')",
      "auth.id in linkedData.ref('log.profiles.user.id')"
    )
  )
);

const activityCanLinkReply = ruleStrings.and(
  activityCanLinkSameTeamContent,
  ruleStrings.group(
    ruleStrings.or(
      activityCanManageByTeamId,
      "auth.id in linkedData.ref('author.user.id')",
      "auth.id in linkedData.ref('record.log.profiles.user.id')"
    )
  )
);

const activityTeamLink = ruleStrings.or(
  ruleStrings.group(
    ruleStrings.and(
      'linkedData.id == data.teamId',
      "data.teamId in auth.ref('$user.roles.team.id')"
    )
  ),
  ruleStrings.group(
    ruleStrings.and(
      'linkedData.teamId == data.id',
      "data.id in auth.ref('$user.roles.team.id')"
    )
  )
);

const activityCanLinkActor = 'linkedData.user == auth.id';

const rules = {
  $default: { allow: { $default: `false` } },
  activities: {
    allow: {
      view: activityCanView,
      create: activityIsTeamMemberByTeamId,
      update: 'false',
      delete: activityCanDelete,
      link: {
        logs: activityCanLinkLog,
        profiles: activityCanLinkActor,
        records: activityCanLinkRecord,
        replies: activityCanLinkReply,
        teams: activityCanLinkTeam,
      },
    },
  },
  $users: {
    bind: [
      'isTeammate',
      "data.id in data.ref('ui.team.roles.user.id')",
      'hasInviteTokenAccess',
      ruleStrings.or(
        "ruleParams.inviteToken in data.ref('roles.team.invites.token')",
        "ruleParams.inviteToken in data.ref('profile.logs.invites.token')"
      ),
    ],
    allow: {
      view: 'auth.id == data.id || isTeammate || hasInviteTokenAccess',
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
      "auth.id in data.ref('author.user.id')",
      'isRecordAuthor',
      "auth.id in data.ref('record.author.user.id')",
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
        links: 'isTeamMember && (isAuthor || canManage || isLogMember)',
        reactions: 'isTeamMember && (isAuthor || canManage || isLogMember)',
        activities: 'isTeamMember && (isAuthor || canManage || isLogMember)',
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
      'hasInviteTokenProfileAccess',
      ruleStrings.or(
        "ruleParams.inviteToken in data.ref('profile.user.roles.team.invites.token')",
        "ruleParams.inviteToken in data.ref('profile.logs.invites.token')"
      ),
    ],
    allow: {
      view: ruleStrings.or(
        "auth.id in data.ref('profile.user.id')",
        'isTeammate',
        'isTeamMember',
        'canViewRecordFiles',
        'canViewReplyFiles',
        'isLoglessDraftRecordFile',
        'hasInviteTokenProfileAccess'
      ),
      create:
        "hasOneLink && (auth.id in data.ref('profile.user.id') || isTeamImageManager)",
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
        "auth.id in data.ref('profile.user.id')",
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
      'hasInviteToken',
      'data.token == ruleParams.inviteToken',
      'isValidToken',
      'newData.token != null && size(newData.token) > 0 && size(newData.token) <= 64',
      'isValidRole',
      `newData.role in ['${Role.Admin}', '${Role.Member}']`,
      'isValidTeamId',
      "newData.teamId in data.ref('team.id')",
      'isValidKey',
      "newData.key == newData.token + '_' + newData.role + '_' + newData.teamId",
      'isCreator',
      "auth.id in data.ref('creator.user.id')",
      'logsBelongToTeam',
      "data.ref('logs.teamId').all(teamId, teamId == data.teamId)",
      'isValidLogScope',
      ruleStrings.or(
        ruleStrings.and(
          `newData.role == '${Role.Admin}'`,
          "size(data.ref('logs.id')) == 0"
        ),
        ruleStrings.and(
          `newData.role == '${Role.Member}'`,
          "size(data.ref('logs.id')) > 0",
          'logsBelongToTeam'
        )
      ),
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
      view: 'isTeamMember || hasInviteToken',
      create:
        'canManage && isCreator && isValidToken && isValidRole && isValidTeamId && isValidKey && isValidLogScope',
      update: 'false',
      delete: 'canManage',
      link: {
        creator: ruleStrings.canManageAuthTeam('data.teamId'),
        logs: ruleStrings.and(
          ruleStrings.canManageAuthTeam('data.teamId'),
          'isValidLogScope'
        ),
        team: ruleStrings.canManageAuthTeam('data.teamId'),
      },
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
      logIsTeamMember,
      'isLogMember',
      logIsLogMember,
      'hasInviteToken',
      logHasInviteToken,
      'isLinkedProfileOwner',
      logIsLinkedProfileOwner,
      'canManage',
      logCanManage,
    ],
    allow: {
      view: 'hasInviteToken || (isTeamMember && (canManage || isLogMember))',
      create: 'canManage && isValidName',
      update: 'canManage && isValidName',
      delete: 'canManage',
      link: {
        activities: logCanLinkContent,
        invites: 'auth.id != null',
        profiles: logCanLinkProfiles,
        records: logCanLinkContent,
      },
    },
  },
  profiles: {
    bind: [
      'isValidName',
      'newData.name == null || size(newData.name) <= 32',
      'isAuthenticated',
      'auth.id != null',
      'hasSharedLogAccess',
      "auth.id != null && auth.id in data.ref('logs.profiles.user.id')",
      'hasInviteTokenAccess',
      ruleStrings.or(
        "ruleParams.inviteToken in data.ref('user.roles.team.invites.token')",
        "ruleParams.inviteToken in data.ref('logs.invites.token')"
      ),
      'hasManagedTeamOwnerAccess',
      ruleStrings.isOwnerFor('user.roles.team.id'),
      'hasManagedTeamAdminAccess',
      ruleStrings.isAdminFor('user.roles.team.id'),
      'hasManagedTeamAccess',
      'hasManagedTeamOwnerAccess || hasManagedTeamAdminAccess',
    ],
    allow: {
      view: "auth.id in data.ref('user.id') || hasSharedLogAccess || hasManagedTeamAccess || hasInviteTokenAccess",
      create: 'isAuthenticated && isValidName',
      update: "auth.id in data.ref('user.id') && isValidName",
      delete: "auth.id in data.ref('user.id')",
      link: {
        records: 'auth.id != null',
        replies: 'auth.id != null',
        reactions: 'auth.id != null',
        actorActivities: 'auth.id != null',
        invites: 'auth.id != null',
      },
    },
  },
  subscriptions: {
    bind: ['isOwner', "auth.id in data.ref('user.id')"],
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
      "auth.id in data.ref('author.user.id')",
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
  cards: {
    bind: [
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'isLogMember',
      "auth.id in data.ref('log.profiles.user.id')",
      'canManage',
      ruleStrings.canManageFor('team.id'),
      'onlyModifiesCardOrder',
      "request.modifiedFields.all(field, field in ['order'])",
    ],
    allow: {
      view: 'isTeamMember && (canManage || isLogMember)',
      create: 'false',
      update: 'canManage && onlyModifiesCardOrder',
      delete: 'canManage',
    },
  },
  records: {
    bind: [
      'isValidNewText',
      'newData.text == null || size(newData.text) <= 10240',
      'isAuthor',
      "auth.id in data.ref('author.user.id')",
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
      recordIsDraft,
      'hasLog',
      recordHasLog,
      'isAuthorOwnedLoglessDraft',
      ruleStrings.and(recordIsAuthor, recordIsDraft, recordHasNoLog),
      'isTeamMember',
      recordIsTeamMember,
      'isLogMember',
      recordIsLogMember,
      'canManage',
      recordCanManage,
      'canDeleteOwn',
      ruleStrings.and(recordIsAuthor, recordIsTeamMember),
      'isTeamMemberByTeamId',
      recordIsTeamMemberByTeamId,
      'canManageByTeamId',
      recordCanManageByTeamId,
      'canManageRecordTags',
      recordCanManageRecordTags,
      'hasOnlyRecordTags',
      recordHasOnlyRecordTags,
      'hasSameTeamTags',
      recordHasSameTeamTags,
      'recordTagsBelongToRecordLog',
      recordTagsBelongToRecordLog,
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
        links: recordCanLinkContent,
        replies: recordCanLinkContent,
        reactions: recordCanLinkContent,
        activities: recordCanLinkContent,
        tags: ruleStrings.and(
          recordCanManageRecordTags,
          recordHasOnlyRecordTags,
          recordHasSameTeamTags,
          ruleStrings.group(recordTagsBelongToRecordLog)
        ),
      },
      unlink: { tags: recordCanManageRecordTags },
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
      'hasInviteKey',
      "ruleParams.inviteToken + '_' + newData.role + '_' + newData.teamId in data.ref('team.invites.key')",
      'isFirstRole',
      "size(data.ref('team.roles.id')) == 1",
      'isRoleOwner',
      "auth.id in data.ref('user.id')",
      'isTeamMember',
      "auth.id in data.ref('team.roles.user.id')",
      'isTeamAdmin',
      ruleStrings.isAdmin,
      'isTeamOwner',
      ruleStrings.isOwner,
      'hasInviteTokenPreviewAccess',
      ruleStrings.and(
        "ruleParams.inviteToken in data.ref('team.invites.token')",
        `data.role in ['${Role.Owner}', '${Role.Admin}']`
      ),
    ],
    allow: {
      view: 'isTeamMember || hasInviteTokenPreviewAccess',
      create: ruleStrings.and(
        ruleStrings.group(
          ruleStrings.or(
            'isFirstRole',
            'isTeamOwner',
            'isTeamAdmin',
            ruleStrings.group(ruleStrings.and('isRoleOwner', 'hasInviteKey'))
          )
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
                'isRoleOwner',
                'hasInviteKey',
                `data.role == '${Role.Member}'`,
                `newData.role == '${Role.Admin}'`
              )
            ),
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
      teamIsTeamMember,
      'isTeamOwner',
      ruleStrings.authRoleIn(Role.Owner, 'data.id', "data.ref('roles.key')"),
      'isTeamAdmin',
      ruleStrings.authRoleIn(Role.Admin, 'data.id', "data.ref('roles.key')"),
      'canManage',
      'isTeamOwner || isTeamAdmin',
      'hasTeamId',
      'data.id == ruleParams.teamId',
      'hasInviteToken',
      "ruleParams.inviteToken in data.ref('invites.token')",
      'onlyModifiesRoles',
      "request.modifiedFields.all(field, field in ['roles'])",
    ],
    allow: {
      view: 'isTeamMember || hasTeamId || hasInviteToken',
      create: 'isAuthenticated && isValidName',
      update:
        'canManage && isValidName || (isAuthenticated && hasInviteToken && onlyModifiesRoles)',
      delete: 'isTeamOwner',
      link: { activities: activityTeamLink, invites: 'auth.id != null' },
    },
  },
  ui: { allow: { $default: "auth.id in data.ref('user.id')" } },
} satisfies InstantRules;

export default rules;
