export type AppleStartupImageOrientation = 'landscape' | 'portrait';
export type AppleStartupImageTheme = 'dark' | 'light';

export interface AppleStartupImageSpec {
  id: string;
  pixelRatio: number;
  viewportHeight: number;
  viewportWidth: number;
}

export const appleStartupImageSpecs: AppleStartupImageSpec[] = [
  { id: '320x568@2', pixelRatio: 2, viewportHeight: 568, viewportWidth: 320 },
  { id: '375x667@2', pixelRatio: 2, viewportHeight: 667, viewportWidth: 375 },
  { id: '414x736@3', pixelRatio: 3, viewportHeight: 736, viewportWidth: 414 },
  { id: '375x812@3', pixelRatio: 3, viewportHeight: 812, viewportWidth: 375 },
  { id: '390x844@3', pixelRatio: 3, viewportHeight: 844, viewportWidth: 390 },
  { id: '393x852@3', pixelRatio: 3, viewportHeight: 852, viewportWidth: 393 },
  { id: '402x874@3', pixelRatio: 3, viewportHeight: 874, viewportWidth: 402 },
  { id: '414x896@2', pixelRatio: 2, viewportHeight: 896, viewportWidth: 414 },
  { id: '414x896@3', pixelRatio: 3, viewportHeight: 896, viewportWidth: 414 },
  { id: '428x926@3', pixelRatio: 3, viewportHeight: 926, viewportWidth: 428 },
  { id: '430x932@3', pixelRatio: 3, viewportHeight: 932, viewportWidth: 430 },
  { id: '440x956@3', pixelRatio: 3, viewportHeight: 956, viewportWidth: 440 },
  { id: '744x1133@2', pixelRatio: 2, viewportHeight: 1133, viewportWidth: 744 },
  { id: '768x1024@2', pixelRatio: 2, viewportHeight: 1024, viewportWidth: 768 },
  { id: '810x1080@2', pixelRatio: 2, viewportHeight: 1080, viewportWidth: 810 },
  { id: '820x1180@2', pixelRatio: 2, viewportHeight: 1180, viewportWidth: 820 },
  { id: '834x1112@2', pixelRatio: 2, viewportHeight: 1112, viewportWidth: 834 },
  { id: '834x1194@2', pixelRatio: 2, viewportHeight: 1194, viewportWidth: 834 },
  {
    id: '1024x1366@2',
    pixelRatio: 2,
    viewportHeight: 1366,
    viewportWidth: 1024,
  },
  {
    id: '1032x1376@2',
    pixelRatio: 2,
    viewportHeight: 1376,
    viewportWidth: 1032,
  },
];

export const appleStartupImageThemes: AppleStartupImageTheme[] = [
  'light',
  'dark',
];

export const appleStartupImageOrientations: AppleStartupImageOrientation[] = [
  'portrait',
  'landscape',
];

export const getAppleStartupImageHref = ({
  id,
  orientation,
  theme,
}: {
  id: string;
  orientation: AppleStartupImageOrientation;
  theme: AppleStartupImageTheme;
}) => `/apple-startup/${id}-${orientation}-${theme}.png`;

export const getAppleStartupImageMedia = ({
  orientation,
  pixelRatio,
  theme,
  viewportHeight,
  viewportWidth,
}: AppleStartupImageSpec & {
  orientation: AppleStartupImageOrientation;
  theme: AppleStartupImageTheme;
}) =>
  [
    'screen',
    `(device-width: ${viewportWidth}px)`,
    `(device-height: ${viewportHeight}px)`,
    `(-webkit-device-pixel-ratio: ${pixelRatio})`,
    `(orientation: ${orientation})`,
    `(prefers-color-scheme: ${theme})`,
  ].join(' and ');
