import * as audioAnalysis from '@/api/audio-analysis';
import * as audioAnalysisRepository from '@/api/audio-analysis/repository';
import { assertCanAnalyzeFile } from '@/api/files/file-analysis-permissions';
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

  await assertCanAnalyzeFile({
    dbClient: c.var.db,
    fileId,
    userId: c.var.user.id,
  });

  const file = await audioAnalysisRepository.getAudioFile(c.var.db, fileId);
  await audioAnalysis.transcribeAudioFile({ db: c.var.db, env: c.env, file });
  return c.json({ success: true });
});

app.post('/:fileId/detect-music', db(), auth(), async (c) => {
  const fileId = requireFileId(c.req.param('fileId'));

  await assertCanAnalyzeFile({
    dbClient: c.var.db,
    fileId,
    userId: c.var.user.id,
  });

  const file = await audioAnalysisRepository.getAudioFile(c.var.db, fileId);
  await audioAnalysis.detectAudioFileMusic({ db: c.var.db, env: c.env, file });
  return c.json({ success: true });
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
    transcript: null,
  });

  return c.json({ success: true });
});

export default app;
