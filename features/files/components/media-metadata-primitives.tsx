import * as audioMetadata from '@/features/files/lib/audio-metadata';
import { cn } from '@/lib/cn';
import * as musicLinks from '@/lib/music-links';
import { Button } from '@/ui/button';
import * as Menu from '@/ui/dropdown-menu';
import { Icon } from '@/ui/icon';
import { Image } from '@/ui/image';
import { Text } from '@/ui/text';
import * as React from 'react';
import { Linking, View } from 'react-native';

import {
  AppleLogo,
  DotsThree,
  MusicNote,
  SpotifyLogo,
  YoutubeLogo,
} from 'phosphor-react-native';

export const METADATA_LIST_PRESS_INITIAL_SCROLL_SUPPRESSION_MS = 750;

export const TRACK_SHEET_ARTWORK_SIZE = 36;

const TRACK_ARTWORK_TARGET_SIZE = 512;

export type MediaMetadataPlaybackControls = {
  currentTime: number;
  isPlaying: boolean;
  pause: () => void;
  pendingPlaybackTime?: number | null;
  playFrom: (seconds: number) => Promise<void> | void;
};

export type MetadataRowLayout = { height: number; y: number };

export const getMetadataPortalName = (prefix: string, id: string) =>
  `${prefix}-${id.replace(/:/g, '')}`;

const getProviderIcon = (provider: string) => {
  switch (provider) {
    case 'applemusic': {
      return AppleLogo;
    }

    case 'spotify': {
      return SpotifyLogo;
    }

    case 'youtube': {
      return YoutubeLogo;
    }

    default: {
      return MusicNote;
    }
  }
};

export const TrackArtwork = ({
  className,
  size,
  track,
}: {
  className?: string;
  size: number;
  track: audioMetadata.AudioMetadataTrack;
}) => {
  const artworkUri = audioMetadata.getTrackArtworkUri(track);

  if (artworkUri) {
    return (
      <Image
        contentFit="cover"
        height={size}
        targetSize={TRACK_ARTWORK_TARGET_SIZE}
        uri={artworkUri}
        width={size}
        wrapperClassName={className}
      />
    );
  }

  return (
    <View className={className} style={{ height: size, width: size }}>
      <View className="flex-1 bg-secondary items-center justify-center">
        <Icon className="text-placeholder" icon={MusicNote} size={18} />
      </View>
    </View>
  );
};

export const TrackText = ({
  artistClassName,
  titleClassName,
  track,
}: {
  artistClassName?: string;
  titleClassName?: string;
  track: audioMetadata.AudioMetadataTrack;
}) => (
  <View className="flex-1 min-w-0">
    <Text
      className={cn('font-medium leading-tight text-sm', titleClassName)}
      numberOfLines={1}
    >
      {track.title}
    </Text>
    <Text
      numberOfLines={1}
      className={cn(
        'leading-tight text-muted-foreground text-xs',
        artistClassName
      )}
    >
      {track.artistText}
    </Text>
  </View>
);

export const TrackLinksMenu = ({
  className,
  portalHostName,
  track,
  triggerButtonClassName,
  triggerButtonSize = 'icon-xs',
  triggerButtonVariant = 'ghost',
  triggerButtonWrapperClassName,
  triggerIconClassName,
  triggerIconSize,
}: {
  className?: string;
  portalHostName?: string;
  track: audioMetadata.AudioMetadataTrack;
  triggerButtonClassName?: string;
  triggerButtonSize?: React.ComponentProps<typeof Button>['size'];
  triggerButtonVariant?: React.ComponentProps<typeof Button>['variant'];
  triggerButtonWrapperClassName?: string;
  triggerIconClassName?: string;
  triggerIconSize?: number;
}) => {
  if (track.links.length === 0) return null;

  return (
    <View className={className}>
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button
            accessibilityLabel={`Streaming links for ${track.title}`}
            className={triggerButtonClassName}
            size={triggerButtonSize}
            variant={triggerButtonVariant}
            wrapperClassName={triggerButtonWrapperClassName}
          >
            <Icon
              className={cn('text-muted-foreground', triggerIconClassName)}
              icon={DotsThree}
              size={triggerIconSize}
            />
          </Button>
        </Menu.Trigger>
        <Menu.Content align="end" portalHostName={portalHostName}>
          {track.links.map((link, index) => (
            <Menu.Item
              key={`${link.provider}:${link.url}:${index}`}
              onPress={() => {
                void Linking.openURL(link.url);
              }}
            >
              <Icon
                className="text-placeholder"
                icon={getProviderIcon(link.provider)}
              />
              <Text>{musicLinks.getMusicLinkProviderLabel(link.provider)}</Text>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Root>
    </View>
  );
};
