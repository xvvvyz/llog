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

export const Toolbar = ({
  canAddAudio,
  onBrowseMedia,
  onCaptureMedia,
  onOpenAudio,
  onPickDocuments,
}: {
  canAddAudio: boolean;
  onBrowseMedia: () => void | Promise<void>;
  onCaptureMedia: () => void | Promise<void>;
  onOpenAudio: () => void;
  onPickDocuments: () => void | Promise<void>;
}) =>
  Platform.OS === 'web' ? (
    <>
      <Button onPress={onPickDocuments} size="icon-sm" variant="secondary">
        <Icon icon={Plus} />
      </Button>
      <Button
        disabled={!canAddAudio}
        onPress={onOpenAudio}
        size="icon-sm"
        variant="secondary"
      >
        <Icon icon={Microphone} />
      </Button>
    </>
  ) : (
    <>
      <Button onPress={onPickDocuments} size="icon-sm" variant="secondary">
        <Icon icon={Paperclip} />
      </Button>
      <Button onPress={onBrowseMedia} size="icon-sm" variant="secondary">
        <Icon icon={ImageSquare} />
      </Button>
      {Platform.OS === 'ios' && (
        <Button onPress={onCaptureMedia} size="icon-sm" variant="secondary">
          <Icon icon={Camera} />
        </Button>
      )}
      <Button
        disabled={!canAddAudio}
        onPress={onOpenAudio}
        size="icon-sm"
        variant="secondary"
      >
        <Icon icon={Microphone} />
      </Button>
    </>
  );
