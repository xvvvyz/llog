import { beforeEach, describe, expect, mock, test } from 'bun:test';

const push = mock(() => {});
mock.module('expo-router', () => ({ router: { push } }));

const {
  getLogHref,
  getRecordDetailHref,
  getRecordMediaHref,
  openRecordDetail,
} = await import('@/features/records/lib/route');

describe('record route helpers', () => {
  beforeEach(() => {
    push.mockClear();
  });

  test('encodes dynamic route segments', () => {
    expect(getLogHref('team/log 1')).toBe('/team%2Flog%201');

    expect(getRecordDetailHref('record/id?draft=true')).toBe(
      '/records/record%2Fid%3Fdraft%3Dtrue'
    );

    expect(getRecordMediaHref('record/id', 'file#1')).toBe(
      '/records/record%2Fid/files/file%231'
    );
  });

  test('opens encoded record detail routes', () => {
    openRecordDetail('record/id');
    expect(push).toHaveBeenCalledWith('/records/record%2Fid');
  });

  test('does not navigate without a record id', () => {
    openRecordDetail();
    openRecordDetail('');
    expect(push).not.toHaveBeenCalled();
  });
});
