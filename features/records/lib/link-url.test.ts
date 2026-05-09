import * as linkUrl from '@/features/records/lib/link-url';
import { describe, expect, test } from 'bun:test';

describe('normalizeLinkUrl', () => {
  test('adds https to bare hosts and trims cosmetic root slashes', () => {
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

  test('keeps allowed explicit protocols and normalizes email addresses', () => {
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

  test('rejects blank values, unsupported protocols, missing targets, and whitespace', () => {
    expect(linkUrl.normalizeLinkUrl('')).toBeNull();
    expect(linkUrl.normalizeLinkUrl('javascript:alert(1)')).toBeNull();
    expect(linkUrl.normalizeLinkUrl('ftp://example.com')).toBeNull();
    expect(linkUrl.normalizeLinkUrl('mailto:')).toBeNull();
    expect(linkUrl.normalizeLinkUrl('https://exa mple.com')).toBeNull();
  });
});

describe('getLinkUrlDisplayText', () => {
  test('uses host names for parseable web urls', () => {
    expect(linkUrl.getLinkUrlDisplayText('https://sub.example.com/path')).toBe(
      'sub.example.com'
    );
  });

  test('falls back to the original text when no host can be displayed', () => {
    expect(linkUrl.getLinkUrlDisplayText('mailto:person@example.com')).toBe(
      'mailto:person@example.com'
    );

    expect(linkUrl.getLinkUrlDisplayText('not a url')).toBe('not a url');
  });
});
