import { db } from '@/utilities/db';
import * as React from 'react';

let fileAccessToken: string | null = null;
const listeners = new Set<() => void>();

export const getFileAccessToken = () => fileAccessToken;

export const setFileAccessToken = (token?: string | null) => {
  const next = token ?? null;
  if (next === fileAccessToken) return;
  fileAccessToken = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useFileAccessToken = () =>
  React.useSyncExternalStore(subscribe, getFileAccessToken, getFileAccessToken);

export const isAbsoluteUri = (uri: string) =>
  uri.startsWith('https://') || uri.startsWith('data:image/');

export const isProtectedUri = (uri: string) =>
  uri.startsWith('records/') || uri.startsWith('replies/');

const appendToken = (url: string, token?: string | null) =>
  token ? `${url}?token=${encodeURIComponent(token)}` : url;

export const resolveFileAccessToken = async () =>
  getFileAccessToken() ?? (await db.getAuth())?.refresh_token ?? null;

export const buildFileUrl = (uri: string, token?: string | null) => {
  if (isAbsoluteUri(uri)) return uri;
  const url = `${process.env.EXPO_PUBLIC_API_URL}/files/${uri}`;

  return isProtectedUri(uri)
    ? appendToken(url, token ?? getFileAccessToken())
    : url;
};
