import { beforeEach, describe, expect, mock, test } from 'bun:test';

const push = mock(() => {});
mock.module('expo-router', () => ({ router: { push } }));

const {
  getHighlightedRecordDetailHref,
  getLogHref,
  getRecordDetailHref,
  getRecordMediaHref,
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
