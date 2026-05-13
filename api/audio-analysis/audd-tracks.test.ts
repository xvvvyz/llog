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
    const tracks = parseAuddMusicTracks(readFixture('audd-video-bussit.json'), {
      audioDurationMs: 114590,
    });

    expect(titles(tracks)).toEqual(['FOO BAR']);

    expect(tracks[0]).toMatchObject({
      artists: ['Foo Artist'],
      end: 112380,
      start: 108001,
      title: 'FOO BAR',
    });
  });

  test('drops contained hits', () => {
    const tracks = parseAuddMusicTracks(
      readFixture('audd-contained-false-positive.json'),
      { audioDurationMs: 10 * 60 * 1000 }
    );

    expect(titles(tracks)).toEqual(['Foo Track']);

    expect(tracks[0]).toMatchObject({
      artists: ['Foo Artist'],
      end: 84000,
      start: 0,
    });
  });

  test('requires enough chunks', () => {
    const tracks = parseAuddMusicTracks(
      readFixture('audd-long-two-chunk.json'),
      { audioDurationMs: 10 * 60 * 1000 }
    );

    expect(tracks).toEqual([]);
  });

  test('prefers remix titles', () => {
    const tracks = parseAuddMusicTracks(readFixture('audd-remix-title.json'), {
      audioDurationMs: 10 * 60 * 1000,
    });

    expect(titles(tracks)).toEqual(['Foo Bar Song (Baz Qux Remix)']);

    expect(tracks[0]?.links).toEqual([
      { provider: 'audd', url: 'https://lis.tn/remix' },
    ]);
  });
});
