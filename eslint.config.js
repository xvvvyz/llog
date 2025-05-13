const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  require('eslint-config-expo/flat'),
  require('eslint-plugin-prettier/recommended'),
  { ignores: ['dist/*'] },
]);
