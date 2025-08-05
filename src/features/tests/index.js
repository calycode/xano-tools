// src/tests/index.js
import { loadOAS } from './utils/loadOAS.js';
import { loadSetupFile } from './utils/loadSetup.js';
import { runOasApiTests } from './runner.js';
import fs from 'fs/promises';

export async function runTestSuite({ oas, setup, secrets, output, baseUrl, headers, defaultAsserts }) {
   // Load OAS
   const oasSpec = await loadOAS(oas);
   // Load endpoints
   const endpointsToTest = await loadSetupFile(setup);
   // Load secrets if needed
   let secretsObj = {};
   if (secrets) {
      secretsObj = JSON.parse(await fs.readFile(secrets, 'utf8'));
   }

   // Run tests
   return await runOasApiTests({
      oasSpec,
      endpointsToTest,
      baseUrl,
      headers,
      secrets: secretsObj,
      output,
      defaultAsserts
   });
}
