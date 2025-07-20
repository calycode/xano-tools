// src/config/xcc.config.js
export default {
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
   test: {
      oas: './oas.yaml',
      setup: './config/xcc.test.setup.local.json',
      secrets: './tests/secrets.json', // Needs to be stored actually securely e.g. with keytar
      defaultAsserts: {
         statusOk: "error",
         responseDefined: "error",
         responseSchema: "error",
      },
      output: './output/tests/test-results.json',
      baseUrl: 'https://your-xano-instance.xano.io/api:group',
      headers: {
         'X-Branch': 'staging',
         'X-Data-Source': 'test',
      },
   },
   // Future features e.g. proper json schema 2020-12 draft creation from OAS with AJV + scaffold whole projects (from XS templates)
   // I know AI will most probably be able to do those things better and better, but for reliability and truly robust systems
   // I'd still keep it in my own control. Maybe I'm not bullish enough on AI...
};
