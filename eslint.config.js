import importPlugin from 'eslint-plugin-import';
import js from '@eslint/js';

export default [
   js.configs.recommended,
   importPlugin.flatConfigs.recommended,
   {
      basePath: 'src/',
      files: ['**/*.js'],
      ignores: ['node_modules/**', 'output/**'],
      languageOptions: {
         ecmaVersion: 'latest',
         sourceType: 'module',
         globals: {
            process: 'readonly',
            Buffer: 'readonly',
            URL: 'readonly',
            URLSearchParams: 'readonly',
            fetch: 'readonly',
            console: 'readonly'
         },
      },
      rules: {
         'import/no-unresolved': 'error',
         'import/order': ['warn', { groups: ['builtin', 'external', 'internal'] }],
         'import/extensions': ['error', 'always'],
      },
      settings: {
         'import/resolver': {
            node: { extensions: ['.js'] },
         },
      },
   },
];