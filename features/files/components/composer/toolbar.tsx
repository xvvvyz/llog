import { blurActiveTextInput } from '@/lib/blur-active-text-input';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import * as ScrollSheetMenu from '@/ui/scroll-sheet-menu';
import { Text } from '@/ui/text';
import type * as React from 'react';
import { Platform } from 'react-native';

import {
  Camera,
  Files as FilesIcon,
  ImageSquare,
  Microphone,
  Plus,
} from 'phosphor-react-native';

export const Toolbar = ({
  attachmentMenuItems,
  disabled,
  canAddAudio,
  onBrowseMedia,
  onCaptureMedia,
  onOpenAudio,
  onPickDocuments,
  portalName,
  trailingItems,
}: {
  attachmentMenuItems?: React.ReactNode;
  disabled?: boolean;
  canAddAudio: boolean;
  onBrowseMedia: () => void | Promise<void>;
  onCaptureMedia: () => void | Promise<void>;
  onOpenAudio: () => void;
  onPickDocuments: () => void | Promise<void>;
  portalName: string;
  trailingItems?: React.ReactNode;
}) => {
  const handleOpenAudio = () => {
    blurActiveTextInput();
    onOpenAudio();
  };

  const attachmentMenu = (
    <ScrollSheetMenu.Root
      portalName={portalName}
      trigger={({ open }) => (
        <Button
          accessibilityLabel="Add attachment"
          disabled={disabled}
          onPress={open}
          size="icon-xs"
          variant="secondary"
        >
          <Icon icon={Plus} />
        </Button>
      )}
    >
      {Platform.OS === 'ios' && (
        <ScrollSheetMenu.Item disabled={disabled} onPress={onCaptureMedia}>
          <Icon className="text-placeholder" icon={Camera} />
          <Text>Camera</Text>
        </ScrollSheetMenu.Item>
      )}
      {Platform.OS !== 'web' && (
        <ScrollSheetMenu.Item disabled={disabled} onPress={onBrowseMedia}>
          <Icon className="text-placeholder" icon={ImageSquare} />
          <Text>Photos</Text>
        </ScrollSheetMenu.Item>
      )}
      <ScrollSheetMenu.Item disabled={disabled} onPress={onPickDocuments}>
        <Icon className="text-placeholder" icon={FilesIcon} />
        <Text>Files</Text>
      </ScrollSheetMenu.Item>
      {attachmentMenuItems}
    </ScrollSheetMenu.Root>
  );

  return (
    <>
      {attachmentMenu}
      <Button
        disabled={disabled || !canAddAudio}
        onPress={handleOpenAudio}
        size="icon-xs"
        variant="secondary"
      >
        <Icon icon={Microphone} />
      </Button>
      {trailingItems}
    </>
  );
};
