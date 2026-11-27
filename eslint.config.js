'use strict';
const js = require('@eslint/js');

const nodeGlobals = { require: 'readonly', module: 'writable', process: 'readonly', console: 'readonly', __dirname: 'readonly', setTimeout: 'readonly', setInterval: 'readonly', fetch: 'readonly', AbortSignal: 'readonly' };
const browserGlobals = { document: 'readonly', fetch: 'readonly', FormData: 'readonly' };

module.exports = [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  { files: ['*.js', 'test/**/*.js'], languageOptions: { sourceType: 'commonjs', ecmaVersion: 2023, globals: nodeGlobals } },
  { files: ['public/**/*.js'], languageOptions: { sourceType: 'script', ecmaVersion: 2023, globals: browserGlobals } },
  { rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } }
];
