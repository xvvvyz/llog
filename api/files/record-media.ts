import { canDeleteMedia, createMediaRoutes } from '@/api/files/media-routes';
import { HTTPException } from 'hono/http-exception';
const requireRecordId = (recordId?: string) => {
  if (!recordId) {
    throw new HTTPException(400, { message: 'Record not found' });
  }

  return recordId;
};

const app = createMediaRoutes({
  basePath: '/records/:recordId/media',
  resolveDeleteTarget: async (c) => {
    const mediaId = c.req.param('mediaId');
    const recordId = c.req.param('recordId');

    if (!mediaId || !recordId) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    const { media } = await c.var.db.query({
      media: {
        $: { where: { id: mediaId } },
        record: {
          author: { user: { $: { fields: ['id'] } } },
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
    });

    const item = media[0];

    return {
      canDelete:
        item?.record?.id === recordId &&
        canDeleteMedia({
          actorRole: item?.record?.log?.team?.roles?.[0]?.role,
          isAuthor: item?.record?.author?.user?.id === c.var.user.id,
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
