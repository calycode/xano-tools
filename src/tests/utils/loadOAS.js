// src/tests/utils/loadOAS.js
import fs from 'fs/promises';
import yaml from 'js-yaml';

/**
 * Loads a local OpenAPI spec (YAML or JSON).
 * @param {string} oasPath - Path to the OAS file (YAML or JSON).
 * @returns {Promise<object>} The parsed OpenAPI spec object.
 */
export async function loadOAS(oasPath) {
   if (!oasPath) throw new Error('No OAS path provided');
   const contents = await fs.readFile(oasPath, 'utf8');
   if (oasPath.endsWith('.json')) {
      return JSON.parse(contents);
   }
   // Default to YAML
   return yaml.load(contents);
}
