import * as fileRouter from '@/api/files/file-router';
import { HTTPException } from 'hono/http-exception';

const requireRecordId = (recordId?: string) => {
  if (!recordId) throw new HTTPException(400, { message: 'Record not found' });
  return recordId;
};

const app = fileRouter.createFileRouter({
  basePath: '/records/:recordId/files',
  resolveDeleteTarget: async (c) => {
    const fileId = c.req.param('fileId');
    const recordId = c.req.param('recordId');

    if (!fileId || !recordId) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    const { files } = await c.var.db.query({
      files: {
        $: { where: { id: fileId } },
        record: {
          $: { fields: ['id', 'isDraft'] },
          author: { user: { $: { fields: ['id'] } } },
          log: {
            $: { fields: ['id'] },
            team: {
              roles: {
                $: { fields: ['role'], where: { userId: c.var.user.id } },
              },
            },
          },
        },
      },
    });

    const item = files[0];

    return {
      canDelete:
        item?.record?.id === recordId &&
        fileRouter.canDeleteFile({
          actorRole: item?.record?.log?.team?.roles?.[0]?.role,
          isAuthor: item?.record?.author?.user?.id === c.var.user.id,
          isLoglessDraft: item?.record?.isDraft && !item.record.log?.id,
        }),
      item,
    };
  },
  resolveUploadTarget: async (c) => {
    const recordId = requireRecordId(c.req.param('recordId'));

    return {
      keyPrefix: `records/${recordId}`,
      linkField: 'record' as const,
      linkId: recordId,
      recordId,
    };
  },
});

export default app;
