// src/config/xcc.config.js
export default {
   instance: {
      baseUrl: 'https://your-xano-instance.xano.io',
      metadataKey: 'encrypted_metadata_key',
   },
   process: {
      input: 'workspace.yaml',
      output: 'output/repo',
   },
   lint: {
      input: 'output/repo/app',
      output: 'output/lint/lint-results.json',
      rules: {
         'is-valid-verb': 'error',
         'is-camel-case': 'warn',
         'is-description-present': 'warn',
      },
   },
   test: [
      {
         name: 'Default',
         oas: './oas.yaml',
         setup: 'xcc.test.setup.json',
         secrets: './tests/secrets.json',
         defaultAsserts: {
            statusOk: 'error',
            responseDefined: 'error',
            responseSchema: 'off',
         },
         output: './output/tests/test-results.json',
         headers: {
            'X-Branch': 'staging',
            'X-Data-Source': 'test',
         },
      },
   ],
   openApiSpecs: [
      {
         name: 'Default',
         input: './oas.json',
         output: 'output/oas',
      },
   ],
};
