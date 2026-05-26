import * as recordStatus from '@/domain/records/status';
import { describe, expect, test } from 'bun:test';

describe('record status', () => {
  test('requires valid status', () => {
    expect(recordStatus.getRecordStatus({ status: 'published' })).toBe(
      'published'
    );

    expect(() => recordStatus.getRecordStatus({ status: 'archived' })).toThrow(
      'Invalid record status'
    );
  });

  test('checks optional status', () => {
    expect(recordStatus.getOptionalRecordStatus({})).toBeUndefined();
    expect(recordStatus.recordIsPublished({})).toBe(false);
    expect(recordStatus.recordIsScheduled(undefined)).toBe(false);
    expect(recordStatus.recordIsUnpublished({ status: 'draft' })).toBe(true);
  });
});
