import * as audioAnalysisRepository from '@/api/audio-analysis/repository';
import { assertCanAnalyzeFile } from '@/api/files/file-analysis-permissions';
import { enqueueJob } from '@/api/jobs/payload';
import { auth, db } from '@/api/middleware/db';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono<{ Bindings: CloudflareEnv }>();

const requireFileId = (fileId?: string) => {
  if (!fileId) throw new HTTPException(400, { message: 'Invalid file' });
  return fileId;
};

app.post('/:fileId/transcribe', db(), auth(), async (c) => {
  const fileId = requireFileId(c.req.param('fileId'));
  const requestedAt = new Date().toISOString();

  await assertCanAnalyzeFile({
    dbClient: c.var.db,
    fileId,
    userId: c.var.user.id,
  });

  await audioAnalysisRepository.updateAudioFile(c.var.db, fileId, {
    isTranscribing: true,
    transcriptionRequestedAt: requestedAt,
  });

  try {
    await enqueueJob(c.env, {
      fileId,
      requestedAt,
      schemaVersion: 1,
      type: 'audio.transcribe',
    });
  } catch (error) {
    await audioAnalysisRepository.updateAudioFile(c.var.db, fileId, {
      isTranscribing: false,
      transcriptionRequestedAt: null,
    });

    throw error;
  }

  return c.json({ queued: true, success: true });
});

app.post('/:fileId/detect-music', db(), auth(), async (c) => {
  const fileId = requireFileId(c.req.param('fileId'));
  const requestedAt = new Date().toISOString();

  await assertCanAnalyzeFile({
    dbClient: c.var.db,
    fileId,
    userId: c.var.user.id,
  });

  await audioAnalysisRepository.updateAudioFile(c.var.db, fileId, {
    identificationRequestedAt: requestedAt,
    isIdentifying: true,
  });

  try {
    await enqueueJob(c.env, {
      fileId,
      requestedAt,
      schemaVersion: 1,
      type: 'audio.identify',
    });
  } catch (error) {
    await audioAnalysisRepository.updateAudioFile(c.var.db, fileId, {
      identificationRequestedAt: null,
      isIdentifying: false,
    });

    throw error;
  }

  return c.json({ queued: true, success: true });
});

app.post('/:fileId/clear-transcription', db(), auth(), async (c) => {
  const fileId = requireFileId(c.req.param('fileId'));

  await assertCanAnalyzeFile({
    dbClient: c.var.db,
    fileId,
    userId: c.var.user.id,
  });

  await audioAnalysisRepository.updateAudioFile(c.var.db, fileId, {
    isTranscribing: false,
    transcriptionRequestedAt: null,
    transcript: null,
  });

  return c.json({ success: true });
});

export default app;
