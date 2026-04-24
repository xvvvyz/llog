import { generateHtml } from './lib/generate-html';
import { generateMedia } from './lib/generate-media';
import * as generatePlatforms from './lib/generate-platforms';
import { generateTheme } from './lib/generate-theme';

const args = process.argv.slice(2);
const platforms = generatePlatforms.parseAssetPlatforms(args);

console.log(
  `assets: platforms ${generatePlatforms.formatAssetPlatforms(platforms)}`
);

generateTheme();
await generateMedia(platforms);
await generateHtml(platforms);
