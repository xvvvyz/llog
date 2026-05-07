import { recognizeAudioFileMusic } from '@/api/audio-analysis/audd-client';
import { getAuddMusicTracks } from '@/api/audio-analysis/audd-tracks';
import * as audioSource from '@/api/audio-analysis/source';
import { isAudioAnalysisFileType } from '@/domain/files/audio-analysis';
import { init } from '@instantdb/admin';
import { readFileSync } from 'node:fs';

type Options = {
  allWithAudd: boolean;
  allWithTracks: boolean;
  dryRun: boolean;
  envFile: string;
  fileIds: string[];
  refetch: boolean;
};

type ScriptFile = {
  assetKey?: string | null;
  audd?: unknown;
  duration?: number | null;
  id: string;
  isIdentifying?: boolean | null;
  mimeType?: string | null;
  name?: string | null;
  size?: number | null;
  tracks?: unknown;
  type?: string | null;
  uri?: string | null;
};

const usage = `Usage:
  bun scripts/reprocess-audd.ts --file <fileId> [--file <fileId>...] [--refetch] [--dry-run]
  bun scripts/reprocess-audd.ts --all-with-audd [--dry-run]
  bun scripts/reprocess-audd.ts --all-with-tracks --refetch [--dry-run]

Options:
  --all-with-audd     Reparse every audio/video file that has stored raw AudD.
  --all-with-tracks   Target every audio/video file whose tracks field is set.
  --dry-run           Print changes without writing to InstantDB.
  --env-file <path>   Env file to read. Defaults to .dev.vars.production.
  --file <fileId>     Target a specific file. Can be repeated.
  --refetch           Call AudD again and save fresh audd + tracks.
`;

const parseOptions = (): Options => {
  const options: Options = {
    allWithAudd: false,
    allWithTracks: false,
    dryRun: false,
    envFile: '.dev.vars.production',
    fileIds: [],
    refetch: false,
  };

  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    switch (arg) {
      case '--all-with-audd': {
        options.allWithAudd = true;
        break;
      }

      case '--all-with-tracks': {
        options.allWithTracks = true;
        break;
      }

      case '--dry-run': {
        options.dryRun = true;
        break;
      }

      case '--env-file': {
        const value = args[++i];
        if (!value) throw new Error('--env-file requires a path');
        options.envFile = value;
        break;
      }

      case '--file': {
        const value = args[++i];
        if (!value) throw new Error('--file requires an id');
        options.fileIds.push(value);
        break;
      }

      case '--help':

      case '-h': {
        console.log(usage);
        process.exit(0);
      }

      case '--refetch': {
        options.refetch = true;
        break;
      }

      default: {
        throw new Error(`Unknown option: ${arg}`);
      }
    }
  }

  const targetCount =
    options.fileIds.length +
    Number(options.allWithAudd) +
    Number(options.allWithTracks);

  if (targetCount === 0) {
    throw new Error('Choose --file, --all-with-audd, or --all-with-tracks');
  }

  if (options.allWithAudd && options.allWithTracks) {
    throw new Error('Choose only one of --all-with-audd or --all-with-tracks');
  }

  if (options.allWithTracks && !options.refetch) {
    throw new Error('--all-with-tracks requires --refetch');
  }

  return options;
};

const parseEnvFile = (path: string) =>
  Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );

const getTrackTitles = (tracks: unknown) =>
  Array.isArray(tracks)
    ? tracks
        .map((track) =>
          track && typeof track === 'object' && 'title' in track
            ? track.title
            : undefined
        )
        .filter(Boolean)
    : [];

const getTrackCount = (tracks: unknown) =>
  Array.isArray(tracks) ? tracks.length : null;

const getAuddStats = (audd: unknown) => {
  if (!Array.isArray(audd)) return { chunks: null, rawHits: null };

  return {
    chunks: audd.length,
    rawHits: audd.reduce(
      (total, chunk) =>
        total +
        (chunk &&
        typeof chunk === 'object' &&
        'songs' in chunk &&
        Array.isArray(chunk.songs)
          ? chunk.songs.length
          : 0),
      0
    ),
  };
};

const getFiles = async ({
  db,
  options,
}: {
  db: ReturnType<typeof init>;
  options: Options;
}) => {
  const { files } = await db.query({
    files: {
      $: {
        fields: [
          'assetKey',
          'audd',
          'duration',
          'id',
          'isIdentifying',
          'mimeType',
          'name',
          'size',
          'tracks',
          'type',
          'uri',
        ],
        ...(options.fileIds.length
          ? { where: { id: { $in: options.fileIds } } }
          : {}),
      },
    },
  });

  return (files ?? [])
    .filter((file): file is ScriptFile =>
      isAudioAnalysisFileType(
        typeof file.type === 'string' ? file.type : undefined
      )
    )
    .filter((file) => {
      if (options.fileIds.length) return true;
      if (options.allWithAudd) return file.audd != null;
      return file.tracks != null;
    });
};

const main = async () => {
  const options = parseOptions();
  const env = parseEnvFile(options.envFile) as unknown as CloudflareEnv;

  const db = init({
    adminToken: env.INSTANT_APP_ADMIN_TOKEN,
    appId: env.INSTANT_APP_ID,
    disableValidation: true,
  });

  const files = await getFiles({ db, options });
  const results = [];

  for (const file of files) {
    const beforeCount = getTrackCount(file.tracks);

    try {
      if (options.refetch) {
        if (!file.assetKey) {
          results.push({
            beforeCount,
            id: file.id,
            reason: 'missing assetKey',
            status: 'skipped',
          });

          continue;
        }

        if (!options.dryRun) {
          await db.transact(
            db.tx.files[file.id].update({ isIdentifying: true })
          );
        }

        const sourceResult = await audioSource.resolveAudioAnalysisSource({
          env,
          file: { ...file, assetKey: file.assetKey } as never,
        });

        if (sourceResult.status === 'pending') {
          if (!options.dryRun) {
            await db.transact(
              db.tx.files[file.id].update({ isIdentifying: false })
            );
          }

          results.push({ beforeCount, id: file.id, status: 'pending' });
          continue;
        }

        const recognition = await recognizeAudioFileMusic({
          env,
          file,
          url: sourceResult.source.url,
        });

        if (!options.dryRun) {
          await db.transact(
            db.tx.files[file.id].update({
              audd: recognition.audd,
              isIdentifying: false,
              tracks: recognition.tracks,
            })
          );
        }

        results.push({
          afterCount: recognition.tracks.length,
          audd: getAuddStats(recognition.audd),
          beforeCount,
          id: file.id,
          status: options.dryRun ? 'dry-run' : 'updated',
          titles: getTrackTitles(recognition.tracks),
        });

        continue;
      }

      if (file.audd == null) {
        results.push({
          beforeCount,
          id: file.id,
          reason: 'missing audd',
          status: 'skipped',
        });

        continue;
      }

      const tracks = await getAuddMusicTracks(file.audd, {
        audioDurationMs: file.duration,
      });

      if (!options.dryRun) {
        await db.transact(
          db.tx.files[file.id].update({ isIdentifying: false, tracks })
        );
      }

      results.push({
        afterCount: tracks.length,
        beforeCount,
        id: file.id,
        status: options.dryRun ? 'dry-run' : 'updated',
        titles: getTrackTitles(tracks),
      });
    } catch (error) {
      if (!options.dryRun) {
        await db.transact(
          db.tx.files[file.id].update({ isIdentifying: false })
        );
      }

      results.push({
        beforeCount,
        error: error instanceof Error ? error.message : String(error),
        id: file.id,
        status: 'error',
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        processed: results.length,
        results,
        updated: results.filter((result) =>
          ['dry-run', 'updated'].includes(result.status)
        ).length,
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  console.error(usage);
  process.exit(1);
});
