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
  test('keeps repeated short-video detection and drops isolated middle hits', () => {
    const tracks = parseAuddMusicTracks(readFixture('audd-video-bussit.json'), {
      audioDurationMs: 114590,
    });

    expect(titles(tracks)).toEqual(['BUSSIT']);

    expect(tracks[0]).toMatchObject({
      artists: ['Joey Valence & Brae'],
      end: 112380,
      start: 108001,
      title: 'BUSSIT',
    });
  });

  test('drops candidates mostly contained by a stronger track', () => {
    const tracks = parseAuddMusicTracks(
      readFixture('audd-contained-false-positive.json'),
      { audioDurationMs: 10 * 60 * 1000 }
    );

    expect(titles(tracks)).toEqual(['Main Track']);

    expect(tracks[0]).toMatchObject({
      artists: ['Main Artist'],
      end: 84000,
      start: 0,
    });
  });

  test('requires three chunks for normal long-audio candidates', () => {
    const tracks = parseAuddMusicTracks(
      readFixture('audd-long-two-chunk.json'),
      { audioDurationMs: 10 * 60 * 1000 }
    );

    expect(tracks).toEqual([]);
  });

  test('prefers detailed remix titles with matching song links', () => {
    const tracks = parseAuddMusicTracks(readFixture('audd-remix-title.json'), {
      audioDurationMs: 10 * 60 * 1000,
    });

    expect(titles(tracks)).toEqual(['Mermaid Song (Mihai Popoviciu Remix)']);

    expect(tracks[0]?.links).toEqual([
      { provider: 'audd', url: 'https://lis.tn/remix' },
    ]);
  });
});
