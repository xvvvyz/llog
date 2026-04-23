import * as pickedMedia from '@/features/media/lib/picked-media';
import { alert } from '@/lib/alert';
import { getDocumentAsync } from 'expo-document-picker';

import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from 'expo-image-picker';

import * as React from 'react';

export const useMediaPickerActions = ({
  onUploadAssets,
}: {
  onUploadAssets: (assets: pickedMedia.PickedMediaAsset[]) => void;
}) => {
  const showCapturePermissionAlert = React.useCallback(
    ({
      needsCamera,
      needsLibrary,
    }: {
      needsCamera: boolean;
      needsLibrary: boolean;
    }) => {
      const title =
        needsCamera && needsLibrary
          ? 'Camera and photo library'
          : needsCamera
            ? 'Camera'
            : 'Photo library';

      const message =
        needsCamera && needsLibrary
          ? 'Allow access to take photos and videos.'
          : needsCamera
            ? 'Allow access to take photos and videos.'
            : 'Allow access to save photos and videos.';

      alert({
        message,
        title,
      });
    },
    []
  );

  const ensureMediaLibraryPermission = React.useCallback(async () => {
    const permission = await requestMediaLibraryPermissionsAsync();
    if (permission.granted) return true;

    alert({
      message: 'Allow access to add photos and videos.',
      title: 'Photo library',
    });

    return false;
  }, []);

  const handleBrowseMedia = React.useCallback(async () => {
    const hasPermission = await ensureMediaLibraryPermission();
    if (!hasPermission) return;

    const picker = await launchImageLibraryAsync({
      allowsMultipleSelection: true,
      exif: false,
      mediaTypes: ['images', 'videos'],
      orderedSelection: true,
    });

    if (picker.canceled) return;

    onUploadAssets(
      picker.assets
        .map((asset) => pickedMedia.normalizeImagePickerAsset(asset))
        .filter((asset): asset is pickedMedia.PickedMediaAsset => !!asset)
    );
  }, [ensureMediaLibraryPermission, onUploadAssets]);

  const handlePickFiles = React.useCallback(async () => {
    const picker = await getDocumentAsync({
      base64: false,
      copyToCacheDirectory: true,
      multiple: true,
      type: pickedMedia.FILE_PICKER_MIME_TYPES,
    });

    if (picker.canceled) return;

    const assets = (picker.assets ?? [])
      .map((asset) => pickedMedia.normalizeDocumentPickerAsset(asset))
      .filter((asset): asset is pickedMedia.PickedMediaAsset => !!asset);

    if (!assets.length) {
      alert({
        message: 'Choose an image, video, or audio file.',
        title: 'Unsupported file',
      });

      return;
    }

    onUploadAssets(assets);
  }, [onUploadAssets]);

  const handleCaptureMedia = React.useCallback(async () => {
    const [cameraPermission, libraryPermission] = await Promise.all([
      requestCameraPermissionsAsync(),
      requestMediaLibraryPermissionsAsync(),
    ]);

    if (!cameraPermission.granted || !libraryPermission.granted) {
      showCapturePermissionAlert({
        needsCamera: !cameraPermission.granted,
        needsLibrary: !libraryPermission.granted,
      });

      return;
    }

    const picker = await launchCameraAsync({
      exif: false,
      mediaTypes: ['images', 'videos'],
    });

    if (picker.canceled) return;

    onUploadAssets(
      picker.assets
        .map((asset) => pickedMedia.normalizeImagePickerAsset(asset))
        .filter((asset): asset is pickedMedia.PickedMediaAsset => !!asset)
    );
  }, [onUploadAssets, showCapturePermissionAlert]);

  return {
    handleBrowseMedia,
    handleCaptureMedia,
    handlePickFiles,
  };
};
