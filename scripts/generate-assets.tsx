import { Resvg } from '@resvg/resvg-js';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import satori from 'satori';
import { UI } from '../theme/ui';
import * as appleStartup from '../utilities/apple-startup-images';
import { AppIcon } from './logo-mark';

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

const renderPng = async (opts: Parameters<typeof renderSvg>[0]) =>
  new Resvg(renderSvg(opts)).render().asPng();

const ICON_PADDING = 0.22;
const ICON_RADIUS = 0.48;
const MASKABLE_PADDING = 0.1;
const MASKABLE_RADIUS = ICON_RADIUS;

const iconOutputs = [
  {
    path: join(process.cwd(), 'assets', 'icon.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 1024,
  },
  {
    path: join(process.cwd(), 'assets', 'favicon.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 1024,
  },
  {
    path: join(process.cwd(), 'public', 'apple-touch-icon.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 512,
  },
  {
    path: join(process.cwd(), 'public', 'apple-touch-icon-180.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 180,
  },
  {
    path: join(process.cwd(), 'public', 'apple-touch-icon-167.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 167,
  },
  {
    path: join(process.cwd(), 'public', 'apple-touch-icon-152.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 152,
  },
  {
    path: join(process.cwd(), 'public', 'icon-192.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 192,
  },
  {
    path: join(process.cwd(), 'public', 'icon-512.png'),
    paddingRatio: ICON_PADDING,
    radiusRatio: ICON_RADIUS,
    size: 512,
  },
  {
    path: join(process.cwd(), 'public', 'icon-192-maskable.png'),
    paddingRatio: MASKABLE_PADDING,
    radiusRatio: MASKABLE_RADIUS,
    size: 192,
  },
  {
    path: join(process.cwd(), 'public', 'icon-512-maskable.png'),
    paddingRatio: MASKABLE_PADDING,
    radiusRatio: MASKABLE_RADIUS,
    size: 512,
  },
] as const;

for (const output of iconOutputs) {
  await mkdir(dirname(output.path), { recursive: true });
  await Bun.write(output.path, await renderPng(output));
}

// Badge — monochrome (white pills, transparent background) for use in notification status bar
await Bun.write(
  join(process.cwd(), 'public', 'badge-72.png'),
  new Resvg(
    renderToStaticMarkup(
      React.createElement(AppIcon, {
        backgroundColor: 'transparent',
        colors: ['white', 'white', 'white'],
        cropToContent: true,
        dotColors: ['white', 'white', 'white'],
        size: 72,
      })
    ),
    { fitTo: { mode: 'width', value: 72 } }
  )
    .render()
    .asPng()
);

// SVG favicon — clip rounds outer corners to match inner squares; used by Chrome/Firefox/Edge.
// Generated at 512 for a high-resolution coordinate space; no explicit width/height so it scales freely.
const faviconSvg = renderSvg({
  clip: true,
  paddingRatio: ICON_PADDING,
  radiusRatio: ICON_RADIUS,
  size: 512,
});

await Bun.write(join(process.cwd(), 'public', 'favicon.svg'), faviconSvg);

await Bun.write(
  join(process.cwd(), 'public', 'favicon-32.png'),
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
  join(process.cwd(), 'public', 'favicon.ico'),
  buildIco([
    { data: ico32, size: 32 },
    { data: ico512, size: 512 },
  ])
);

const startupOutputDirectory = join(process.cwd(), 'public', 'apple-startup');

const renderStartupImage = async ({
  height,
  theme,
  width,
}: {
  height: number;
  theme: appleStartup.AppleStartupImageTheme;
  width: number;
}) => {
  const palette = UI[theme];
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
          backgroundColor: palette.background,
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

  return new Resvg(svg).render().asPng();
};

await rm(startupOutputDirectory, { force: true, recursive: true });
await mkdir(startupOutputDirectory, { recursive: true });

for (const spec of appleStartup.appleStartupImageSpecs) {
  for (const orientation of appleStartup.appleStartupImageOrientations) {
    const width =
      (orientation === 'portrait' ? spec.viewportWidth : spec.viewportHeight) *
      spec.pixelRatio;

    const height =
      (orientation === 'portrait' ? spec.viewportHeight : spec.viewportWidth) *
      spec.pixelRatio;

    for (const theme of appleStartup.appleStartupImageThemes) {
      const png = await renderStartupImage({ height, theme, width });

      const relativeHref = appleStartup
        .getAppleStartupImageHref({
          id: spec.id,
          orientation,
          theme,
        })
        .replace(/^\//, '');

      await Bun.write(join(process.cwd(), 'public', relativeHref), png);
    }
  }
}
