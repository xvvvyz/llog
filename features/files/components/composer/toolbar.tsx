import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import type * as React from 'react';
import { Platform } from 'react-native';

import {
  Camera,
  ImageSquare,
  Microphone,
  Paperclip,
  UploadSimple,
} from 'phosphor-react-native';

export const Toolbar = ({
  canAddAudio,
  onBrowseMedia,
  onCaptureMedia,
  onOpenAudio,
  onPickDocuments,
  trailingItems,
}: {
  canAddAudio: boolean;
  onBrowseMedia: () => void | Promise<void>;
  onCaptureMedia: () => void | Promise<void>;
  onOpenAudio: () => void;
  onPickDocuments: () => void | Promise<void>;
  trailingItems?: React.ReactNode;
}) => {
  return Platform.OS === 'web' ? (
    <>
      <Button onPress={onPickDocuments} size="icon-xs" variant="secondary">
        <Icon icon={UploadSimple} />
      </Button>
      <Button
        disabled={!canAddAudio}
        onPress={onOpenAudio}
        size="icon-xs"
        variant="secondary"
      >
        <Icon icon={Microphone} />
      </Button>
      {trailingItems}
    </>
  ) : (
    <>
      <Button onPress={onPickDocuments} size="icon-xs" variant="secondary">
        <Icon icon={Paperclip} />
      </Button>
      <Button onPress={onBrowseMedia} size="icon-xs" variant="secondary">
        <Icon icon={ImageSquare} />
      </Button>
      {Platform.OS === 'ios' && (
        <Button onPress={onCaptureMedia} size="icon-xs" variant="secondary">
          <Icon icon={Camera} />
        </Button>
      )}
      <Button
        disabled={!canAddAudio}
        onPress={onOpenAudio}
        size="icon-xs"
        variant="secondary"
      >
        <Icon icon={Microphone} />
      </Button>
      {trailingItems}
    </>
  );
};
