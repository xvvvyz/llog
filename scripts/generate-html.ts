import { join } from 'node:path';
import { UI } from '../theme/ui';
import * as appleStartupImages from '../utilities/apple-startup-images';

const light = UI.light.background;
const dark = UI.dark.background;

const startupLinks = appleStartupImages.appleStartupImageSpecs.flatMap((spec) =>
  appleStartupImages.appleStartupImageOrientations.flatMap((orientation) =>
    appleStartupImages.appleStartupImageThemes.map((theme) => {
      const media = appleStartupImages.getAppleStartupImageMedia({
        ...spec,
        orientation,
        theme,
      });
      const href = appleStartupImages.getAppleStartupImageHref({
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
  `<meta name="theme-color" content="${light}"/>`,
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

await Bun.write(join(process.cwd(), 'public', 'index.html'), html);
