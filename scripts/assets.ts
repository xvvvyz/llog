import * as generatePlatforms from './lib/generate-platforms';
import { generateTheme } from './lib/generate-theme';

const args = process.argv.slice(2);
const platforms = generatePlatforms.parseAssetPlatforms(args);

console.log(
  `assets: platforms ${generatePlatforms.formatAssetPlatforms(platforms)}`
);

generateTheme();

const [{ generateMedia }, { generateHtml }] = await Promise.all([
  import('./lib/generate-media'),
  import('./lib/generate-html'),
]);

await generateMedia(platforms);
await generateHtml(platforms);
