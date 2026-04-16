import { UI } from '../theme/ui';

const html = await Bun.file('web/index.html').text();
const dark = UI.dark.background;
const style = `<style>html,body,#root{background-color:${dark}}</style>`;
const themeColor = `<meta name="theme-color" content="${dark}" />`;

await Bun.write(
  'web/index.html',
  html
    .replace('<head>', `<head>${style}${themeColor}`)
    .replace('<link rel="icon" href="/favicon.ico" />', '')
);
