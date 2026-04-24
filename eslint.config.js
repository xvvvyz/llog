const { defineConfig } = require('eslint/config');
const packageJson = require('./package.json');
const reactVersion = packageJson.dependencies.react.replace(/^[^0-9]*/, '');

module.exports = defineConfig([
  require('eslint-config-expo/flat'),
  require('eslint-plugin-prettier/recommended'),
  {
    settings: { react: { version: reactVersion } },
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
]);
