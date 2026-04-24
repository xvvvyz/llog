import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Platform } from 'react-native';

import {
  Camera,
  ImageSquare,
  Microphone,
  Paperclip,
  Plus,
} from 'phosphor-react-native';

export const MediaComposerToolbar = ({
  canAddAudio,
  onBrowseMedia,
  onCaptureMedia,
  onOpenAudio,
  onPickFiles,
}: {
  canAddAudio: boolean;
  onBrowseMedia: () => void | Promise<void>;
  onCaptureMedia: () => void | Promise<void>;
  onOpenAudio: () => void;
  onPickFiles: () => void | Promise<void>;
}) =>
  Platform.OS === 'web' ? (
    <>
      <Button
        className="size-8"
        onPress={onPickFiles}
        size="icon"
        variant="secondary"
      >
        <Icon icon={Plus} />
      </Button>
      <Button
        className="size-8"
        disabled={!canAddAudio}
        onPress={onOpenAudio}
        size="icon"
        variant="secondary"
      >
        <Icon icon={Microphone} />
      </Button>
    </>
  ) : (
    <>
      <Button
        className="size-8"
        onPress={onPickFiles}
        size="icon"
        variant="secondary"
      >
        <Icon icon={Paperclip} />
      </Button>
      <Button
        className="size-8"
        onPress={onBrowseMedia}
        size="icon"
        variant="secondary"
      >
        <Icon icon={ImageSquare} />
      </Button>
      {Platform.OS === 'ios' && (
        <Button
          className="size-8"
          onPress={onCaptureMedia}
          size="icon"
          variant="secondary"
        >
          <Icon icon={Camera} />
        </Button>
      )}
      <Button
        className="size-8"
        disabled={!canAddAudio}
        onPress={onOpenAudio}
        size="icon"
        variant="secondary"
      >
        <Icon icon={Microphone} />
      </Button>
    </>
  );
