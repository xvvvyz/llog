import * as logTemplates from '@/domain/logs/templates';
import { recordTagFields } from '@/domain/tags/query';
import type { Log } from '@/features/logs/types/log';
import { db } from '@/lib/db';
import { id as generateId } from '@instantdb/react-native';

type CopyTemplateTargetLog = Pick<Log, 'id' | 'teamId'>;

const loadTemplateCopyData = async ({
  targetLogIds,
  templateId,
}: {
  targetLogIds: string[];
  templateId: string;
}) => {
  const [{ data: sourceData }, { data: targetTemplateData }] =
    await Promise.all([
      db.queryOnce({
        templates: {
          $: {
            fields: [
              'id' as const,
              'logId' as const,
              'order' as const,
              'teamId' as const,
              'text' as const,
            ],
            where: { id: templateId },
          },
          tags: { $: { fields: recordTagFields } },
        },
      }),
      db.queryOnce({
        templates: {
          $: {
            fields: [
              'id' as const,
              'logId' as const,
              'order' as const,
              'teamId' as const,
              'text' as const,
            ],
            where: { logId: { $in: targetLogIds } },
          },
        },
      }),
    ]);

  const { data: logsData } = await db.queryOnce({
    logs: {
      $: {
        fields: ['id' as const, 'teamId' as const],
        where: { id: { $in: targetLogIds } },
      },
    },
  });

  const targetTeamIds = [
    ...new Set((logsData.logs ?? []).flatMap((log) => log.teamId ?? [])),
  ];

  const { data } = targetTeamIds.length
    ? await db.queryOnce({
        tags: {
          $: {
            fields: recordTagFields,
            order: { order: 'asc' as const },
            where: { teamId: { $in: targetTeamIds }, type: 'record' },
          },
          logs: { $: { fields: ['id' as const] } },
        },
      })
    : { data: { tags: [] } };

  const sourceTemplate = sourceData.templates?.find(
    (template) => template.id === templateId
  );

  return {
    logs: logsData.logs ?? [],
    sourceTemplate,
    tags: data.tags ?? [],
    templates: targetTemplateData.templates ?? [],
  };
};

const assertTargetLogs = ({
  targetLogIds,
  targetLogs,
}: {
  targetLogIds: string[];
  targetLogs: CopyTemplateTargetLog[];
}) => {
  const targetLogById = new Map(targetLogs.map((log) => [log.id, log]));

  return targetLogIds.map((logId) => {
    const targetLog = targetLogById.get(logId);

    if (!targetLog?.id || !targetLog.teamId) {
      throw new Error('Invalid target log');
    }

    return { id: targetLog.id, teamId: targetLog.teamId };
  });
};

export const copyTemplate = async ({
  createMissingTags = false,
  logIds,
  templateId,
  text,
}: {
  createMissingTags?: boolean;
  logIds: string[];
  templateId?: string;
  text?: string;
}) => {
  const targetLogIds = [...new Set(logIds.map((logId) => logId.trim()))].filter(
    Boolean
  );

  if (!templateId || targetLogIds.length === 0) return;

  const { logs, sourceTemplate, tags, templates } = await loadTemplateCopyData({
    targetLogIds,
    templateId,
  });

  if (!sourceTemplate?.text) throw new Error('Template not found');
  const templateText = text ?? sourceTemplate.text;
  if (!templateText.trim()) return;
  const targetLogs = assertTargetLogs({ targetLogIds, targetLogs: logs });
  const templatesByLogId = new Map<string, { order?: number | null }[]>();
  const tagsByLogId = new Map<string, typeof tags>();

  for (const template of templates) {
    if (!template.logId || template.id === templateId) continue;
    const logTemplates = templatesByLogId.get(template.logId) ?? [];
    logTemplates.push(template);
    templatesByLogId.set(template.logId, logTemplates);
  }

  for (const tag of tags) {
    for (const log of tag.logs ?? []) {
      if (!log.id) continue;
      const logTags = tagsByLogId.get(log.id) ?? [];
      logTags.push(tag);
      tagsByLogId.set(log.id, logTags);
    }
  }

  const transactions = [];

  for (const targetLog of targetLogs) {
    const copiedTemplateId = generateId();

    const tagPlan = logTemplates.resolveCopyTemplateTagsForTargetLog({
      createMissingTags,
      sourceTags: sourceTemplate.tags,
      targetTags: tagsByLogId.get(targetLog.id),
    });

    const createdTagIds = [];
    const targetTags = tagsByLogId.get(targetLog.id) ?? [];
    const missingTagCount = tagPlan.missingTags.length;

    if (missingTagCount > 0) {
      transactions.push(
        ...targetTags.map((tag, index) =>
          db.tx.tags[tag.id].update({ order: index + missingTagCount })
        )
      );
    }

    for (const [index, tag] of tagPlan.missingTags.entries()) {
      const tagId = generateId();
      createdTagIds.push(tagId);

      transactions.push(
        db.tx.tags[tagId]
          .update({
            color: tag.color,
            name: tag.name,
            order: index,
            teamId: targetLog.teamId,
            type: 'record',
          })
          .link({ logs: targetLog.id, team: targetLog.teamId })
      );
    }

    transactions.push(
      db.tx.templates[copiedTemplateId]
        .update({
          logId: targetLog.id,
          order: logTemplates.getNextTemplateOrder(
            templatesByLogId.get(targetLog.id) ?? []
          ),
          teamId: targetLog.teamId,
          text: templateText,
        })
        .link({ log: targetLog.id }),
      ...[...tagPlan.linkedTagIds, ...createdTagIds].map((tagId) =>
        db.tx.templates[copiedTemplateId].link({ tags: tagId })
      )
    );
  }

  return db.transact(transactions);
};
