import { createClient } from '@hey-api/openapi-ts';
import { updateOpenapiSpec } from '../update/index.js';

export async function generateClientSdk(input, output) {
   const oas = await updateOpenapiSpec(input, output);
   const clientOutput = output + '/client-sdk';
   createClient({ input: oas, output: clientOutput });
}
