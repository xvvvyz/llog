import { generateHtml } from './lib/generate-html';
import { generateMedia } from './lib/generate-media';
import { generateTheme } from './lib/generate-theme';

import {
  formatAssetPlatforms,
  parseAssetPlatforms,
} from './lib/generate-platforms';

const args = process.argv.slice(2);
const platforms = parseAssetPlatforms(args);
console.log(`assets: platforms ${formatAssetPlatforms(platforms)}`);
generateTheme();
await generateMedia(platforms);
await generateHtml(platforms);
