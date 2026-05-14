import { beforeEach, describe, expect, mock, test } from 'bun:test';

const push = mock(() => {});
mock.module('expo-router', () => ({ router: { push } }));

const {
  getHighlightedRecordDetailHref,
  getLogHref,
  getRecordDetailHref,
  getRecordDetailUrl,
  getRecordMediaHref,
  getRecordReplyDetailUrl,
  openRecordDetail,
} = await import('@/features/records/lib/route');

describe('record routes', () => {
  beforeEach(() => {
    push.mockClear();
  });

  test('encodes routes', () => {
    expect(getLogHref('team/log 1')).toBe('/team%2Flog%201');

    expect(getRecordDetailHref('record/id?draft=true')).toBe(
      '/records/record%2Fid%3Fdraft%3Dtrue'
    );

    expect(getRecordMediaHref('record/id', 'file#1')).toBe(
      '/records/record%2Fid/files/file%231'
    );
  });

  test('builds share URLs', () => {
    expect(getRecordDetailUrl('record/id', ' https://llog.example/// ')).toBe(
      'https://llog.example/records/record%2Fid'
    );

    expect(
      getRecordReplyDetailUrl('record/id', 'reply?id=1', 'https://llog.example')
    ).toBe('https://llog.example/records/record%2Fid?replyId=reply%3Fid%3D1');
  });

  test('opens record routes', () => {
    openRecordDetail('record/id');
    expect(push).toHaveBeenCalledWith('/records/record%2Fid');
  });

  test('opens highlighted record routes', () => {
    openRecordDetail('record/id', undefined, { highlight: true });

    expect(push).toHaveBeenCalledWith(
      getHighlightedRecordDetailHref('record/id')
    );
  });

  test('skips missing record ids', () => {
    openRecordDetail();
    openRecordDetail('');
    expect(push).not.toHaveBeenCalled();
  });
});
