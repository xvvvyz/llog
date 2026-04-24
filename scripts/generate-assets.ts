import {
  formatAssetPlatforms,
  parseAssetPlatforms,
} from './generate-platforms';

const args = process.argv.slice(2);
const platforms = parseAssetPlatforms(args);
console.log(`generate-assets: platforms ${formatAssetPlatforms(platforms)}`);

const commands = [
  ['bun', 'scripts/generate-theme.ts'],
  ['bun', 'scripts/generate-media.tsx', ...args],
  ['bun', 'scripts/generate-html.ts', ...args],
] as const;

for (const command of commands) {
  const process = Bun.spawn(command, { stdout: 'inherit', stderr: 'inherit' });
  const exitCode = await process.exited;
  if (exitCode !== 0) process.exit(exitCode);
}
