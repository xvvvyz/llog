import { HTTPException } from 'hono/http-exception';
import * as mediaRoutes from './media-routes';

const requireReplyTarget = async (c: mediaRoutes.MediaContext) => {
  const replyId = c.req.param('replyId');
  const recordId = c.req.param('recordId');

  if (!replyId || !recordId) {
    throw new HTTPException(400, { message: 'Reply not found' });
  }

  await mediaRoutes.assertReplyRecord(c.var.db, replyId, recordId);

  return { recordId, replyId };
};

const app = mediaRoutes.createMediaRoutes({
  basePath: '/records/:recordId/replies/:replyId/media',
  resolveDeleteTarget: async (c) => {
    const replyId = c.req.param('replyId');
    const mediaId = c.req.param('mediaId');
    const recordId = c.req.param('recordId');

    if (!replyId || !mediaId || !recordId) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    const { media } = await c.var.db.query({
      media: {
        $: { where: { id: mediaId } },
        reply: {
          $: { fields: ['id'] as ['id'] },
          author: { user: { $: { fields: ['id'] } } },
          record: {
            $: { fields: ['id'] as ['id'] },
            log: {
              team: {
                roles: {
                  $: {
                    fields: ['role'] as ['role'],
                    where: { userId: c.var.user.id },
                  },
                },
              },
            },
          },
        },
      },
    });

    const item = media[0];

    return {
      canDelete:
        item?.reply?.id === replyId &&
        item?.reply?.record?.id === recordId &&
        mediaRoutes.canDeleteMedia({
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
