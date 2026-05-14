import * as linkUrl from '@/features/records/lib/link-url';
import { describe, expect, test } from 'bun:test';

describe('normalizeLinkUrl', () => {
  test('normalizes web URLs', () => {
    expect(linkUrl.normalizeLinkUrl(' example.com ')).toBe(
      'https://example.com'
    );

    expect(linkUrl.normalizeLinkUrl('example.com?tab=links')).toBe(
      'https://example.com?tab=links'
    );

    expect(linkUrl.normalizeLinkUrl('example.com/path?tab=links#details')).toBe(
      'https://example.com/path?tab=links#details'
    );
  });

  test('keeps allowed protocols', () => {
    expect(linkUrl.normalizeLinkUrl('https://example.com/records')).toBe(
      'https://example.com/records'
    );

    expect(linkUrl.normalizeLinkUrl('person@example.com')).toBe(
      'mailto:person@example.com'
    );

    expect(linkUrl.normalizeLinkUrl('tel:+15551234567')).toBe(
      'tel:+15551234567'
    );

    expect(linkUrl.normalizeLinkUrl('sms:+15551234567')).toBe(
      'sms:+15551234567'
    );
  });

  test('rejects invalid URLs', () => {
    expect(linkUrl.normalizeLinkUrl('')).toBeNull();
    expect(linkUrl.normalizeLinkUrl('javascript:alert(1)')).toBeNull();
    expect(linkUrl.normalizeLinkUrl('ftp://example.com')).toBeNull();
    expect(linkUrl.normalizeLinkUrl('mailto:')).toBeNull();
    expect(linkUrl.normalizeLinkUrl('https://exa mple.com')).toBeNull();
  });
});

describe('getLinkUrlDisplayText', () => {
  test('displays hosts', () => {
    expect(linkUrl.getLinkUrlDisplayText('https://sub.example.com/path')).toBe(
      'sub.example.com'
    );
  });

  test('falls back to text', () => {
    expect(linkUrl.getLinkUrlDisplayText('mailto:person@example.com')).toBe(
      'mailto:person@example.com'
    );

    expect(linkUrl.getLinkUrlDisplayText('not a url')).toBe('not a url');
  });
});
