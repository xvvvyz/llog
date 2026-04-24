import { type Media } from '@/features/media/types/media';
import * as React from 'react';

const mediaSources = new Map<symbol, Media[]>();
const subscribers = new Set<() => void>();
const EMPTY_MEDIA: Media[] = [];

const emitChange = () => {
  subscribers.forEach((subscriber) => subscriber());
};

export const setMediaLightboxRouteSource = (
  sourceId: symbol,
  media: Media[]
) => {
  mediaSources.set(sourceId, media);
  emitChange();
};

export const removeMediaLightboxRouteSource = (sourceId: symbol) => {
  mediaSources.delete(sourceId);
  emitChange();
};

export const subscribeMediaLightboxRouteSources = (subscriber: () => void) => {
  subscribers.add(subscriber);

  return () => {
    subscribers.delete(subscriber);
  };
};

export const getMediaLightboxRouteMedia = (mediaId?: string) => {
  if (!mediaId) return EMPTY_MEDIA;

  for (const media of mediaSources.values()) {
    if (media.some((item) => item.id === mediaId)) return media;
  }

  return EMPTY_MEDIA;
};

export const useMediaLightboxRouteMedia = (mediaId?: string) =>
  React.useSyncExternalStore(
    subscribeMediaLightboxRouteSources,
    () => getMediaLightboxRouteMedia(mediaId),
    () => EMPTY_MEDIA
  );
