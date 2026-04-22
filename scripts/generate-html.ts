import * as startupImages from '@/lib/apple-startup-images';
import { UI } from '@/theme/ui';
import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import { createLogger } from './logger';

const { flush, log, progress } = createLogger('generate-html');

const light = UI.light.background;
const dark = UI.dark.background;

const publicPath = (...segments: string[]) =>
  join(process.cwd(), 'public', ...segments);

const startupLinks = startupImages.appleStartupImageSpecs.flatMap((spec) =>
  startupImages.appleStartupImageOrientations.flatMap((orientation) =>
    startupImages.appleStartupImageThemes.map((theme) => {
      const media = startupImages.getAppleStartupImageMedia({
        ...spec,
        orientation,
        theme,
      });

      const href = startupImages.getAppleStartupImageHref({
        id: spec.id,
        orientation,
        theme,
      });

      return `<link rel="apple-touch-startup-image" media="${media}" href="${href}"/>`;
    })
  )
);

const tags = [
  `<meta charset="utf-8"/>`,
  `<title>llog</title>`,
  `<meta name="apple-mobile-web-app-capable" content="yes"/>`,
  `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>`,
  `<meta name="apple-mobile-web-app-title" content="llog"/>`,
  `<meta name="color-scheme" content="light dark"/>`,
  `<meta name="description" content="Track anything in your world."/>`,
  `<meta name="theme-color" content="${dark}" media="(prefers-color-scheme: dark)"/>`,
  `<meta name="theme-color" content="${light}" media="(prefers-color-scheme: light)"/>`,
  `<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no,interactive-widget=resizes-content,user-scalable=no,viewport-fit=auto"/>`,
  `<style id="background-color">html,body,#root{background-color:${light}}@media(prefers-color-scheme:dark){html,body,#root{background-color:${dark}}}</style>`,
  `<style id="expo-reset">html,body{height:100%}body{overflow:hidden}#root{display:flex;height:100%;flex:1}</style>`,
  `<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>`,
  `<link rel="manifest" href="/manifest.webmanifest"/>`,
  `<link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152.png"/>`,
  `<link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167.png"/>`,
  `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png"/>`,
  `<link rel="apple-touch-icon" sizes="512x512" href="/apple-touch-icon.png"/>`,
  ...startupLinks,
];

const html = `<!doctype html><html lang="en"><head>${tags.join('')}</head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div></body></html>`;
const outputPath = publicPath('index.html');
const tempPath = publicPath('index.html.tmp');
const manifestPath = publicPath('manifest.webmanifest');

const manifest = JSON.stringify(
  {
    name: 'llog',
    short_name: 'llog',
    id: '/',
    description: 'Track anything in your world.',
    display: 'standalone',
    start_url: '/',
    scope: '/',
    background_color: dark,
    theme_color: dark,
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
  null,
  2
);

progress('Writing index.html');
await Bun.write(tempPath, html);
await rename(tempPath, outputPath);
progress(`Wrote ${outputPath}`);
flush();

progress('Writing manifest.webmanifest');
await Bun.write(manifestPath, `${manifest}\n`);
progress(`Wrote ${manifestPath}`);
flush();
log('Done');
