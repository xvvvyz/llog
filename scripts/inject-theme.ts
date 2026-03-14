import { UI } from '../theme/ui';

const html = await Bun.file('web/index.html').text();
const light = UI.light.background;
const dark = UI.dark.background;

const style = `<style>html,body{background-color:${light}}@media(prefers-color-scheme:dark){html,body{background-color:${dark}}}</style>`;

await Bun.write('web/index.html', html.replace('<head>', `<head>${style}`));
