import { UI } from '@/theme/ui';
import { Resvg } from '@resvg/resvg-js';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import satori from 'satori';
import * as startupImages from './apple-startup-images';
import { createLogger } from './logger';
import { AppIcon } from './logo-mark';

import {
  AssetPlatformSelection,
  formatAssetPlatforms,
} from './generate-platforms';

const { NATIVE_SPLASH_BACKGROUNDS } = require('../../theme/native.cjs') as {
  NATIVE_SPLASH_BACKGROUNDS: { light: string; dark: string };
};

const PROJECT_ROOT = process.cwd();
const MEDIA_CACHE_PATH = join(PROJECT_ROOT, '.expo', 'generate-media.json');

const MEDIA_SOURCE_PATHS = [
  join(PROJECT_ROOT, 'scripts', 'lib', 'generate-media.tsx'),
  join(PROJECT_ROOT, 'scripts', 'lib', 'logo-mark.tsx'),
  join(PROJECT_ROOT, 'scripts', 'lib', 'apple-startup-images.ts'),
  join(PROJECT_ROOT, 'theme', 'base.ts'),
  join(PROJECT_ROOT, 'theme', 'native.cjs'),
  join(PROJECT_ROOT, 'theme', 'spectrum.ts'),
  join(PROJECT_ROOT, 'theme', 'ui.ts'),
] as const;

const publicPath = (...segments: string[]) =>
  join(PROJECT_ROOT, 'public', ...segments);

const assetsPath = (...segments: string[]) =>
  join(PROJECT_ROOT, 'assets', ...segments);

const fileExists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const createSourceHash = async (paths: readonly string[]) => {
  const hash = createHash('sha256');

  for (const path of paths) {
    hash.update(await readFile(path));
  }

  return hash.digest('hex');
};

const readCachedSourceHash = async (path: string) => {
  try {
    const cache = JSON.parse(await readFile(path, 'utf8')) as {
      sourceHash?: string;
    };

    return typeof cache.sourceHash === 'string' ? cache.sourceHash : null;
  } catch {
    return null;
  }
};

const writeCachedSourceHash = async ({
  path,
  sourceHash,
}: {
  path: string;
  sourceHash: string;
}) => {
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, `${JSON.stringify({ sourceHash }, null, 2)}\n`);
};

const buildIco = (
  images: Array<{ data: Uint8Array; size: number }>
): Buffer => {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const headerBytes = HEADER_SIZE + ENTRY_SIZE * images.length;

  const totalBytes =
    headerBytes + images.reduce((s, img) => s + img.data.length, 0);

  const buf = Buffer.alloc(totalBytes);
  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(1, 2);
  buf.writeUInt16LE(images.length, 4);
  let dataOffset = headerBytes;

  for (let i = 0; i < images.length; i++) {
    const { data, size } = images[i]!;
    const entryBase = HEADER_SIZE + i * ENTRY_SIZE;
    buf[entryBase + 0] = size >= 256 ? 0 : size;
    buf[entryBase + 1] = size >= 256 ? 0 : size;
    buf[entryBase + 2] = 0;
    buf[entryBase + 3] = 0;
    buf.writeUInt16LE(1, entryBase + 4);
    buf.writeUInt16LE(32, entryBase + 6);
    buf.writeUInt32LE(data.length, entryBase + 8);
    buf.writeUInt32LE(dataOffset, entryBase + 12);
    Buffer.from(data).copy(buf, dataOffset);
    dataOffset += data.length;
  }

  return buf;
};

const renderSvg = ({
  clip,
  paddingRatio,
  radiusRatio,
  size,
}: {
  clip?: boolean;
  paddingRatio?: number;
  radiusRatio?: number;
  size: number;
}) =>
  renderToStaticMarkup(
    React.createElement(AppIcon, {
      ...(clip != null ? { clip } : null),
      ...(paddingRatio != null ? { paddingRatio } : null),
      ...(radiusRatio != null ? { radiusRatio } : null),
      size,
    })
  );

const renderSvgToPng = (
  svg: string,
  options?: ConstructorParameters<typeof Resvg>[1]
) => new Resvg(svg, options).render().asPng();

const renderPng = async (opts: Parameters<typeof renderSvg>[0]) =>
  renderSvgToPng(renderSvg(opts));

const renderAppIconPng = async ({
  fitToWidth,
  ...props
}: React.ComponentProps<typeof AppIcon> & { fitToWidth?: number }) =>
  renderSvgToPng(renderToStaticMarkup(React.createElement(AppIcon, props)), {
    ...(fitToWidth != null
      ? { fitTo: { mode: 'width' as const, value: fitToWidth } }
      : null),
  });

const ICON_PADDING = 0.22;
const ICON_RADIUS = 0.48;
const MASKABLE_PADDING = 0.1;
const MASKABLE_RADIUS = ICON_RADIUS;
const ANDROID_ADAPTIVE_CONTENT_SCALE = 0.61;
const contrastBackground = UI.light.contrastBackground;
const contrastForeground = UI.light.contrastForeground;

const sharedNativeIconOutputs = [
  {
    path: assetsPath('icon.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 1024,
  },
] as const;

const iosIconOutputs = [
  {
    path: assetsPath('ios-icon.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 1024,
  },
] as const;

const androidIconOutputs = [
  {
    path: assetsPath('android-icon.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 1024,
  },
] as const;

const webIconOutputs = [
  {
    path: publicPath('apple-touch-icon.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 512,
  },
  {
    path: publicPath('apple-touch-icon-180.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 180,
  },
  {
    path: publicPath('apple-touch-icon-167.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 167,
  },
  {
    path: publicPath('apple-touch-icon-152.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 152,
  },
  {
    path: publicPath('icon-192.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 192,
  },
  {
    path: publicPath('icon-512.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 512,
  },
  {
    path: publicPath('icon-192-maskable.png'),
    paddingRatio: MASKABLE_PADDING,
    radiusRatio: MASKABLE_RADIUS,
    size: 192,
  },
  {
    path: publicPath('icon-512-maskable.png'),
    paddingRatio: MASKABLE_PADDING,
    radiusRatio: MASKABLE_RADIUS,
    size: 512,
  },
] as const;

const androidNativeAssetOutputs = [
  {
    path: assetsPath('android-adaptive-icon-foreground.png'),
    render: () =>
      renderAppIconPng({
        backgroundColor: 'transparent',
        contentScale: ANDROID_ADAPTIVE_CONTENT_SCALE,
        size: 1024,
      }),
  },
  {
    path: assetsPath('android-adaptive-icon-monochrome.png'),
    render: () =>
      renderAppIconPng({
        backgroundColor: 'transparent',
        colors: [contrastBackground, contrastBackground, contrastBackground],
        contentScale: ANDROID_ADAPTIVE_CONTENT_SCALE,
        dotColors: [contrastBackground, contrastBackground, contrastBackground],
        size: 1024,
      }),
  },
] as const;

const sharedNativeAssetOutputs = [
  {
    path: assetsPath('splash-icon.png'),
    render: () =>
      renderAppIconPng({
        backgroundColor: 'transparent',
        cropToContent: true,
        fitToWidth: 1024,
        size: 1024,
      }),
  },
  {
    path: assetsPath('splash-icon-dark.png'),
    render: () =>
      renderAppIconPng({
        backgroundColor: 'transparent',
        colorScheme: 'dark',
        cropToContent: true,
        fitToWidth: 1024,
        size: 1024,
      }),
  },
] as const;

const badgeOutputPath = publicPath('badge-72.png');
const faviconSvgPath = publicPath('favicon.svg');
const favicon32Path = publicPath('favicon-32.png');
const faviconIcoPath = publicPath('favicon.ico');
const startupOutputDirectory = publicPath('apple-startup');

const startupOutputPaths = startupImages.appleStartupImageSpecs.flatMap(
  (spec) =>
    startupImages.appleStartupImageOrientations.flatMap((orientation) =>
      startupImages.appleStartupImageThemes.map((theme) =>
        publicPath(
          startupImages
            .getAppleStartupImageHref({ id: spec.id, orientation, theme })
            .replace(/^\//, '')
        )
      )
    )
);

export async function generateMedia(platforms: AssetPlatformSelection) {
  const { log, progress } = createLogger('generate-media');

  const selectedIconOutputs = [
    ...(platforms.ios || platforms.android ? sharedNativeIconOutputs : []),
    ...(platforms.ios ? iosIconOutputs : []),
    ...(platforms.android ? androidIconOutputs : []),
    ...(platforms.web ? webIconOutputs : []),
  ];

  const selectedNativeAssetOutputs = [
    ...(platforms.ios || platforms.android ? sharedNativeAssetOutputs : []),
    ...(platforms.android ? androidNativeAssetOutputs : []),
  ];

  const selectedWebOutputPaths = platforms.web
    ? [
        badgeOutputPath,
        faviconSvgPath,
        favicon32Path,
        faviconIcoPath,
        ...startupOutputPaths,
      ]
    : [];

  const mediaOutputPaths = [
    ...selectedIconOutputs.map((output) => output.path),
    ...selectedNativeAssetOutputs.map((output) => output.path),
    ...selectedWebOutputPaths,
  ];

  const currentSourceHash = await createSourceHash(MEDIA_SOURCE_PATHS);
  const cachedSourceHash = await readCachedSourceHash(MEDIA_CACHE_PATH);

  const hasAllOutputs =
    cachedSourceHash === currentSourceHash &&
    (await Promise.all(mediaOutputPaths.map(fileExists))).every(Boolean);

  if (hasAllOutputs) {
    log(
      `Assets unchanged for ${formatAssetPlatforms(platforms)}; skipping ${mediaOutputPaths.length} media outputs`
    );

    log('Done');
    return;
  }

  log(
    `Rendering ${selectedIconOutputs.length} app icons for ${formatAssetPlatforms(platforms)}`
  );

  for (const [index, output] of selectedIconOutputs.entries()) {
    await mkdir(dirname(output.path), { recursive: true });
    await Bun.write(output.path, await renderPng(output));
    progress(`Icon ${index + 1}/${selectedIconOutputs.length}: ${output.path}`);
  }

  log(`Rendering ${selectedNativeAssetOutputs.length} native assets`);

  for (const [index, output] of selectedNativeAssetOutputs.entries()) {
    await mkdir(dirname(output.path), { recursive: true });
    await Bun.write(output.path, await output.render());

    progress(
      `Native ${index + 1}/${selectedNativeAssetOutputs.length}: ${output.path}`
    );
  }

  if (platforms.web) {
    log('Rendering notification badge');

    // Badge — monochrome (white pills, transparent background) for use in notification status bar
    await Bun.write(
      badgeOutputPath,
      await renderAppIconPng({
        backgroundColor: 'transparent',
        colors: [contrastForeground, contrastForeground, contrastForeground],
        cropToContent: true,
        dotColors: [contrastForeground, contrastForeground, contrastForeground],
        fitToWidth: 72,
        size: 72,
      })
    );

    log('Rendering SVG favicon');

    // SVG favicon — clip rounds outer corners to match inner squares; used by Chrome/Firefox/Edge.
    // Generated at 512 for a high-resolution coordinate space; no explicit width/height so it scales freely.
    const faviconSvg = renderSvg({
      clip: true,
      paddingRatio: ICON_PADDING,
      radiusRatio: ICON_RADIUS,
      size: 512,
    });

    await Bun.write(faviconSvgPath, faviconSvg);
    log('Rendering favicon PNG assets');

    await Bun.write(
      favicon32Path,
      await renderPng({
        clip: true,
        paddingRatio: ICON_PADDING,
        radiusRatio: ICON_RADIUS,
        size: 32,
      })
    );

    const [ico32, ico512] = await Promise.all([
      renderPng({
        clip: true,
        paddingRatio: ICON_PADDING,
        radiusRatio: ICON_RADIUS,
        size: 32,
      }),
      renderPng({
        clip: true,
        paddingRatio: ICON_PADDING,
        radiusRatio: ICON_RADIUS,
        size: 512,
      }),
    ]);

    await Bun.write(
      faviconIcoPath,
      buildIco([
        { data: ico32, size: 32 },
        { data: ico512, size: 512 },
      ])
    );

    log('Wrote favicon.ico');
  }

  const renderStartupImage = async ({
    height,
    theme,
    width,
  }: {
    height: number;
    theme: startupImages.AppleStartupImageTheme;
    width: number;
  }) => {
    const markSize = Math.min(Math.round(Math.min(width, height) * 0.3), 480);

    const markSvg = renderToStaticMarkup(
      React.createElement(AppIcon, {
        backgroundColor: 'transparent',
        colorScheme: theme,
        size: markSize,
      })
    );

    const markSrc = `data:image/svg+xml;base64,${Buffer.from(markSvg).toString('base64')}`;

    const svg = await satori(
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            width,
            height,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
              theme === 'dark'
                ? NATIVE_SPLASH_BACKGROUNDS.dark
                : NATIVE_SPLASH_BACKGROUNDS.light,
          },
        },
        React.createElement('img', {
          alt: '',
          height: markSize,
          src: markSrc,
          width: markSize,
        })
      ),
      { height, width }
    );

    return renderSvgToPng(svg);
  };

  if (platforms.web) {
    await rm(startupOutputDirectory, { force: true, recursive: true });
    await mkdir(startupOutputDirectory, { recursive: true });

    const totalStartupImages =
      startupImages.appleStartupImageSpecs.length *
      startupImages.appleStartupImageOrientations.length *
      startupImages.appleStartupImageThemes.length;

    let startupImageIndex = 0;
    log(`Rendering ${totalStartupImages} Apple startup images`);

    for (const spec of startupImages.appleStartupImageSpecs) {
      for (const orientation of startupImages.appleStartupImageOrientations) {
        const width =
          (orientation === 'portrait'
            ? spec.viewportWidth
            : spec.viewportHeight) * spec.pixelRatio;

        const height =
          (orientation === 'portrait'
            ? spec.viewportHeight
            : spec.viewportWidth) * spec.pixelRatio;

        for (const theme of startupImages.appleStartupImageThemes) {
          const png = await renderStartupImage({ height, theme, width });

          const relativeHref = startupImages
            .getAppleStartupImageHref({ id: spec.id, orientation, theme })
            .replace(/^\//, '');

          await Bun.write(publicPath(relativeHref), png);
          startupImageIndex += 1;

          progress(
            `Startup ${startupImageIndex}/${totalStartupImages}: ${relativeHref}`
          );
        }
      }
    }
  }

  await writeCachedSourceHash({
    path: MEDIA_CACHE_PATH,
    sourceHash: currentSourceHash,
  });

  log('Done');
}
