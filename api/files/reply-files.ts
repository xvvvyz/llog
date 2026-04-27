import * as fileRouter from '@/api/files/file-router';
import { HTTPException } from 'hono/http-exception';

const requireReplyTarget = async (c: fileRouter.FileContext) => {
  const replyId = c.req.param('replyId');
  const recordId = c.req.param('recordId');

  if (!replyId || !recordId) {
    throw new HTTPException(400, { message: 'Reply not found' });
  }

  await fileRouter.assertReplyRecord(c.var.db, replyId, recordId);
  return { recordId, replyId };
};

const app = fileRouter.createFileRouter({
  basePath: '/records/:recordId/replies/:replyId/files',
  resolveDeleteTarget: async (c) => {
    const replyId = c.req.param('replyId');
    const fileId = c.req.param('fileId');
    const recordId = c.req.param('recordId');

    if (!replyId || !fileId || !recordId) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    const { files } = await c.var.db.query({
      files: {
        $: { where: { id: fileId } },
        reply: {
          $: { fields: ['id'] },
          author: { user: { $: { fields: ['id'] } } },
          record: {
            $: { fields: ['id'] },
            log: {
              team: {
                roles: {
                  $: { fields: ['role'], where: { userId: c.var.user.id } },
                },
              },
            },
          },
        },
      },
    });

    const item = files[0];

    return {
      canDelete:
        item?.reply?.id === replyId &&
        item?.reply?.record?.id === recordId &&
        fileRouter.canDeleteFile({
          actorRole: item?.reply?.record?.log?.team?.roles?.[0]?.role,
          isAuthor: item?.reply?.author?.user?.id === c.var.user.id,
        }),
      item,
    };
  },
  resolveUploadTarget: async (c) => {
    const { recordId, replyId } = await requireReplyTarget(c);

    return {
      keyPrefix: `replies/${replyId}`,
      linkField: 'reply' as const,
      linkId: replyId,
      recordId,
    };
  },
});

export default app;
