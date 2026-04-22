import { deleteMediaAssets } from '@/api/files/media-cleanup';
import * as upload from '@/api/files/upload';
import { auth, type Db, db } from '@/api/middleware/db';
import * as permissions from '@/features/teams/lib/permissions';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

export type MediaContext = {
  env: CloudflareEnv;
  req: {
    param: (name: string) => string | undefined;
  };
  var: {
    db: Db;
    user: {
      id: string;
    };
  };
};

type UploadTarget = {
  keyPrefix: string;
  linkField: 'record' | 'reply';
  linkId: string;
  recordId: string;
};

type MediaAsset = {
  assetKey?: string | null;
  id?: string | null;
  uri?: string | null;
};

type DeleteTarget = {
  canDelete: boolean;
  item?: MediaAsset;
};

type MediaRouteConfig = {
  resolveDeleteTarget: (c: MediaContext) => Promise<DeleteTarget>;
  resolveUploadTarget: (c: MediaContext) => Promise<UploadTarget>;
};

export const assertReplyRecord = async (
  dbClient: Db,
  replyId: string,
  recordId: string
) => {
  const { replies } = await dbClient.query({
    replies: {
      $: {
        fields: ['id'] as ['id'],
        where: { id: replyId, record: recordId },
      },
    },
  });

  if (!replies[0]?.id) {
    throw new HTTPException(400, { message: 'Reply not found' });
  }
};

export const createMediaRoutes = <const TPath extends string>({
  basePath,
  resolveDeleteTarget,
  resolveUploadTarget,
}: MediaRouteConfig & { basePath: TPath }) => {
  const app = new Hono<{ Bindings: CloudflareEnv }>();

  app.post(
    `${basePath}/video-upload`,
    db(),
    auth(),
    upload.directVideoUploadValidator,
    async (c) => {
      const target = await resolveUploadTarget(c);
      const { mediaId, order } = c.req.valid('json');

      const created = await upload.createDirectVideoUploadDraft({
        creatorId: c.var.user.id,
        db: c.var.db,
        env: c.env,
        linkField: target.linkField,
        linkId: target.linkId,
        mediaId,
        order,
        recordId: target.recordId,
      });

      return c.json(created);
    }
  );

  app.put(
    basePath,
    upload.uploadLimit(upload.MAX_MULTIPART_MEDIA_BYTES),
    db(),
    auth(),
    upload.mediaValidator,
    async (c) => {
      const target = await resolveUploadTarget(c);
      const { duration, file, mediaId, order } = c.req.valid('form');

      await upload.uploadMedia({
        creatorId: c.var.user.id,
        db: c.var.db,
        duration,
        env: c.env,
        file,
        keyPrefix: target.keyPrefix,
        linkField: target.linkField,
        linkId: target.linkId,
        mediaId,
        order,
        recordId: target.recordId,
      });

      return c.json({ success: true });
    }
  );

  app.delete(`${basePath}/:mediaId`, db(), auth(), async (c) => {
    const mediaId = c.req.param('mediaId');

    if (!mediaId) {
      throw new HTTPException(400, { message: 'Invalid request' });
    }

    const { canDelete, item } = await resolveDeleteTarget(c);

    if (!item?.id || !canDelete) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    await c.var.db.transact(c.var.db.tx.media[mediaId].delete());
    await deleteMediaAssets(c.env, [item]);

    return c.json({ success: true });
  });

  return app;
};

export const canDeleteMedia = ({
  actorRole,
  isAuthor,
}: {
  actorRole?: string | null;
  isAuthor?: boolean;
}) => Boolean(permissions.isManagedRole(actorRole) || (isAuthor && actorRole));
