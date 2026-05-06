import { enqueueAudioAnalysis } from '@/api/audio-analysis';
import { deleteUnusedFileAssets } from '@/api/files/delete-file-assets';
import * as upload from '@/api/files/file-upload';
import { auth, type Db, db } from '@/api/middleware/db';
import * as permissions from '@/domain/teams/permissions';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

export type FileContext = {
  env: CloudflareEnv;
  req: { param: (name: string) => string | undefined };
  var: { db: Db; user: { id: string } };
};

type UploadTarget = {
  keyPrefix: string;
  linkField: 'record' | 'reply';
  linkId: string;
  recordId: string;
};

type FileAsset = {
  assetKey?: string | null;
  id?: string | null;
  uri?: string | null;
};

type DeleteTarget = { canDelete: boolean; item?: FileAsset };

type FileRouteConfig = {
  resolveDeleteTarget: (c: FileContext) => Promise<DeleteTarget>;
  resolveUploadTarget: (c: FileContext) => Promise<UploadTarget>;
};

export const assertReplyRecord = async (
  dbClient: Db,
  replyId: string,
  recordId: string
) => {
  const { replies } = await dbClient.query({
    replies: {
      $: { fields: ['id'], where: { id: replyId, record: recordId } },
    },
  });

  if (!replies[0]?.id) {
    throw new HTTPException(400, { message: 'Reply not found' });
  }
};

export const createFileRouter = <const TPath extends string>({
  basePath,
  resolveDeleteTarget,
  resolveUploadTarget,
}: FileRouteConfig & { basePath: TPath }) => {
  const app = new Hono<{ Bindings: CloudflareEnv }>();

  app.post(
    `${basePath}/video-upload`,
    db(),
    auth(),
    upload.directVideoUploadValidator,
    async (c) => {
      const target = await resolveUploadTarget(c);
      const { fileId, order, size } = c.req.valid('json');

      const created = await upload.createDirectVideoUploadDraft({
        creatorId: c.var.user.id,
        db: c.var.db,
        env: c.env,
        linkField: target.linkField,
        linkId: target.linkId,
        fileId,
        order,
        recordId: target.recordId,
        size,
      });

      return c.json(created);
    }
  );

  app.put(
    basePath,
    upload.uploadLimit(),
    db(),
    auth(),
    upload.fileValidator,
    async (c) => {
      const target = await resolveUploadTarget(c);

      const {
        audioOrigin,
        duration,
        file,
        fileName,
        fileId,
        mimeType,
        order,
        size,
      } = c.req.valid('form');

      const uploaded = await upload.uploadFile({
        creatorId: c.var.user.id,
        db: c.var.db,
        duration,
        env: c.env,
        file,
        fileName,
        keyPrefix: target.keyPrefix,
        linkField: target.linkField,
        linkId: target.linkId,
        fileId,
        mimeType,
        order,
        recordId: target.recordId,
        size,
      });

      if (uploaded.type === 'audio' && audioOrigin) {
        c.executionCtx.waitUntil(
          enqueueAudioAnalysis({
            env: c.env,
            fileId: uploaded.fileId,
            origin: audioOrigin,
          }).catch((error) => {
            console.error('Failed to enqueue audio analysis', {
              error,
              fileId: uploaded.fileId,
            });
          })
        );
      }

      return c.json({ success: true });
    }
  );

  app.delete(`${basePath}/:fileId`, db(), auth(), async (c) => {
    const fileId = c.req.param('fileId');
    if (!fileId) throw new HTTPException(400, { message: 'Invalid request' });
    const { canDelete, item } = await resolveDeleteTarget(c);

    if (!item?.id || !canDelete) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }

    await deleteUnusedFileAssets(c.env, [item], {
      ignoredFileIds: [item.id],
      throwOnError: true,
    });

    await c.var.db.transact(c.var.db.tx.files[fileId].delete());
    return c.json({ success: true });
  });

  return app;
};

export const canDeleteFile = ({
  actorRole,
  isAuthor,
  isLoglessDraft,
}: {
  actorRole?: string | null;
  isAuthor?: boolean;
  isLoglessDraft?: boolean;
}) =>
  Boolean(
    permissions.isManagedRole(actorRole) ||
    (isAuthor && actorRole) ||
    (isAuthor && isLoglessDraft)
  );
