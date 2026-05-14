import { parseAuddMusicTracks } from '@/api/audio-analysis/audd-tracks';
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtureDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures'
);

const readFixture = (name: string) =>
  JSON.parse(readFileSync(join(fixtureDirectory, name), 'utf8')) as unknown;

const titles = (tracks: ReturnType<typeof parseAuddMusicTracks>) =>
  tracks.map((track) => track.title);

describe('parseAuddMusicTracks', () => {
  test('keeps repeated hits', () => {
    const tracks = parseAuddMusicTracks(
      readFixture('audd-repeated-hits.json'),
      { audioDurationMs: 114590 }
    );

    expect(titles(tracks)).toEqual(['Repeat Track']);

    expect(tracks[0]).toMatchObject({
      artists: ['Repeat Artist'],
      end: 112380,
      start: 108001,
      title: 'Repeat Track',
    });
  });

  test('drops contained hits', () => {
    const tracks = parseAuddMusicTracks(
      readFixture('audd-contained-hits.json'),
      { audioDurationMs: 10 * 60 * 1000 }
    );

    expect(titles(tracks)).toEqual(['Anchor Track']);

    expect(tracks[0]).toMatchObject({
      artists: ['Anchor Artist'],
      end: 84000,
      start: 0,
    });
  });

  test('requires enough chunks', () => {
    const tracks = parseAuddMusicTracks(
      readFixture('audd-insufficient-chunks.json'),
      { audioDurationMs: 10 * 60 * 1000 }
    );

    expect(tracks).toEqual([]);
  });

  test('prefers remix titles', () => {
    const tracks = parseAuddMusicTracks(
      readFixture('audd-remix-preference.json'),
      { audioDurationMs: 10 * 60 * 1000 }
    );

    expect(titles(tracks)).toEqual(['Preview Song (Night Mix)']);

    expect(tracks[0]?.links).toEqual([
      { provider: 'audd', url: 'https://lis.tn/remix' },
    ]);
  });
});
