import importPlugin from 'eslint-plugin-import';
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
// If you want Prettier integration, uncomment below:
// import prettier from 'eslint-config-prettier';

export default [
   js.configs.recommended,
   importPlugin.flatConfigs.recommended,
   // JS files config
   {
      files: ['**/*.js'],
      ignores: ['node_modules/**', 'dist/**', 'output/**'],
      languageOptions: {
         ecmaVersion: 'latest',
         sourceType: 'module',
         globals: {
            process: 'readonly',
            Buffer: 'readonly',
            URL: 'readonly',
            URLSearchParams: 'readonly',
            fetch: 'readonly',
            console: 'readonly',
            __dirname: 'readonly',
            __filename: 'readonly',
         },
      },
      rules: {
         'import/no-unresolved': 'error',
         'import/order': ['warn', { groups: ['builtin', 'external', 'internal'] }],
         'import/extensions': ['error', 'always'],
         // add any JS-specific overrides here
      },
      settings: {
         'import/resolver': {
            node: { extensions: ['.js'] },
         },
      },
   },
   // TS/TSX files config
   {
      files: ['**/*.ts'],
      ignores: ['node_modules/**', 'dist/**', 'output/**'],
      languageOptions: {
         parser: tsParser,
         parserOptions: {
            project: './tsconfig.json',
            sourceType: 'module',
            ecmaVersion: 'latest',
         },
         globals: {
            process: 'readonly',
            Buffer: 'readonly',
            URL: 'readonly',
            URLSearchParams: 'readonly',
            fetch: 'readonly',
            console: 'readonly',
            __dirname: 'readonly',
            __filename: 'readonly',
         },
      },
      plugins: {
         '@typescript-eslint': tseslint,
      },
      rules: {
         ...tseslint.configs.recommended.rules,
         '@typescript-eslint/no-unused-vars': ['warn'],
         '@typescript-eslint/no-explicit-any': 'warn',
         '@typescript-eslint/explicit-module-boundary-types': 'off', // for gradual migration
         'import/no-unresolved': 'error',
         'import/order': ['warn', { groups: ['builtin', 'external', 'internal'] }],
         'import/extensions': [
            'error',
            'ignorePackages',
            {
               js: 'never',
               ts: 'never',
               tsx: 'never',
            },
         ],
      },
      settings: {
         'import/resolver': {
            node: { extensions: ['.js', '.ts', '.tsx'] },
         },
      },
   },
   // Optional: Prettier integration at the end, uncomment if using Prettier
   // prettier,
];
