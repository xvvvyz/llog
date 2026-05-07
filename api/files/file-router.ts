import * as audioAnalysis from '@/api/audio-analysis';
import { deleteUnusedFileAssets } from '@/api/files/delete-file-assets';
import { assertCanAnalyzeTargetFiles } from '@/api/files/file-analysis-permissions';
import * as upload from '@/api/files/file-upload';
import { auth, type Db, db } from '@/api/middleware/db';
import { isAudioAnalysisFileType } from '@/domain/files/audio-analysis';
import { visibleFileQuery } from '@/domain/files/query';
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

const getAudioAnalysisFilesForTarget = async (
  dbClient: Db,
  target: UploadTarget
) => {
  const where =
    target.linkField === 'record'
      ? { record: target.linkId }
      : { reply: target.linkId };

  const { files } = await dbClient.query({
    files: { $: { ...visibleFileQuery.$, where } },
  });

  return files.filter((file) =>
    isAudioAnalysisFileType(file.type)
  ) as audioAnalysis.AudioFile[];
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

  app.post(
    `${basePath}/multipart-upload`,
    db(),
    auth(),
    upload.r2MultipartUploadValidator,
    async (c) => {
      const target = await resolveUploadTarget(c);

      const { duration, fileName, fileId, mimeType, order, size, type } =
        c.req.valid('json');

      const created = await upload.createR2MultipartUploadDraft({
        creatorId: c.var.user.id,
        db: c.var.db,
        duration,
        env: c.env,
        fileName,
        keyPrefix: target.keyPrefix,
        linkField: target.linkField,
        linkId: target.linkId,
        fileId,
        mimeType,
        order,
        recordId: target.recordId,
        size,
        type,
      });

      return c.json(created);
    }
  );

  app.put(
    `${basePath}/multipart-upload/part`,
    db(),
    auth(),
    upload.r2MultipartUploadPartValidator,
    async (c) => {
      const target = await resolveUploadTarget(c);
      const { encoding, fileId, partNumber, uploadId } = c.req.valid('query');

      const part = await upload.uploadR2MultipartPart({
        creatorId: c.var.user.id,
        db: c.var.db,
        encoding,
        env: c.env,
        keyPrefix: target.keyPrefix,
        linkField: target.linkField,
        linkId: target.linkId,
        fileId,
        partNumber,
        recordId: target.recordId,
        request: c.req.raw,
        uploadId,
      });

      return c.json(part);
    }
  );

  app.post(
    `${basePath}/multipart-upload/complete`,
    db(),
    auth(),
    upload.r2MultipartUploadCompleteValidator,
    async (c) => {
      const target = await resolveUploadTarget(c);

      const {
        duration,
        fileName,
        fileId,
        mimeType,
        order,
        parts,
        size,
        type,
        uploadId,
      } = c.req.valid('json');

      await upload.completeR2MultipartUpload({
        creatorId: c.var.user.id,
        db: c.var.db,
        duration,
        env: c.env,
        fileName,
        keyPrefix: target.keyPrefix,
        linkField: target.linkField,
        linkId: target.linkId,
        fileId,
        mimeType,
        order,
        parts,
        recordId: target.recordId,
        size,
        type,
        uploadId,
      });

      return c.json({ success: true });
    }
  );

  app.post(
    `${basePath}/multipart-upload/abort`,
    db(),
    auth(),
    upload.r2MultipartUploadAbortValidator,
    async (c) => {
      const target = await resolveUploadTarget(c);
      const { fileId, uploadId } = c.req.valid('json');

      await upload.abortR2MultipartUpload({
        creatorId: c.var.user.id,
        db: c.var.db,
        env: c.env,
        keyPrefix: target.keyPrefix,
        linkField: target.linkField,
        linkId: target.linkId,
        fileId,
        recordId: target.recordId,
        uploadId,
      });

      return c.json({ success: true });
    }
  );

  app.put(basePath, db(), auth(), upload.fileValidator, async (c) => {
    const target = await resolveUploadTarget(c);

    const { duration, file, fileName, fileId, mimeType, order, size } =
      c.req.valid('form');

    await upload.uploadFile({
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

    return c.json({ success: true });
  });

  app.post(`${basePath}/transcribe`, db(), auth(), async (c) => {
    const target = await resolveUploadTarget(c);

    await assertCanAnalyzeTargetFiles({
      dbClient: c.var.db,
      target,
      userId: c.var.user.id,
    });

    const files = await getAudioAnalysisFilesForTarget(c.var.db, target);

    const result = await audioAnalysis.transcribeAudioFiles({
      db: c.var.db,
      env: c.env,
      files,
    });

    return c.json({ success: true, ...result });
  });

  app.post(`${basePath}/detect-music`, db(), auth(), async (c) => {
    const target = await resolveUploadTarget(c);

    await assertCanAnalyzeTargetFiles({
      dbClient: c.var.db,
      target,
      userId: c.var.user.id,
    });

    const files = await getAudioAnalysisFilesForTarget(c.var.db, target);

    const result = await audioAnalysis.detectAudioFilesMusicTracks({
      db: c.var.db,
      env: c.env,
      files,
    });

    return c.json({ success: true, ...result });
  });

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
