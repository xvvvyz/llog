const fs = require('node:fs');
const path = require('node:path');
const chroma = require('chroma-js');

const themeBaseSource = fs.readFileSync(
  path.join(__dirname, 'base.ts'),
  'utf8'
);

function extractThemeColor(mode, key) {
  const match = themeBaseSource.match(
    new RegExp(`${mode}:\\s*\\{[\\s\\S]*?${key}:\\s*'([^']+)'`)
  );

  if (!match) {
    throw new Error(`Could not find ${mode}.${key} in theme/base.ts`);
  }

  return match[1];
}

function parseOKLCH(oklchStr) {
  const match = oklchStr.match(/oklch\(([^)]+)\)/);

  if (!match) {
    throw new Error(`Invalid OKLCH color: ${oklchStr}`);
  }

  const [l, c, h] = match[1].split('/')[0].trim().split(/\s+/).map(Number);
  return { l, c, h };
}

function oklchToHex(oklchStr) {
  const { l, c, h } = parseOKLCH(oklchStr);
  return chroma.oklch(l, c, h).hex().toLowerCase();
}

const NATIVE_SPLASH_BACKGROUNDS = {
  light: oklchToHex(extractThemeColor('light', 'background')),
  dark: oklchToHex(extractThemeColor('dark', 'background')),
};

module.exports = { NATIVE_SPLASH_BACKGROUNDS };
