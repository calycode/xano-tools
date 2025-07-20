/**
 * @vitest/config
 * See more information here: https://vitest.dev/config
 * 
 * TODO: Add 'setupFiles' to allow an authentication step before running the auth-required tests.
 * TODO: Play around with coverage options, to see if we can actually use this as coverage for XANO.
 * 
*/

import { defineConfig } from 'vitest/config';

export default defineConfig({
   test: {
      include: ['src/tests/**/*.test.js'],
      globals: false,
      clearMocks: true,
      silent: false,
      reporters: ['json', 'junit', 'github-actions', 'verbose'],
      outputFile: {
         json: './reports/json/test-output.json',
         junit: './reports/junit/test-results.xml',
        'github-actions': './reports/github-actions/test-results.txt',
      },
   },
});
