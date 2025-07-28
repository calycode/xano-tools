// src/process-xano/index.js

import { parseYamlFile } from './core/parseYamlFile.js';

export async function processWorkspace({inputFile, outputDir}) {
   // Validate arguments here
   if (!inputFile) throw new Error('Input YAML file is required');
   if (!outputDir) throw new Error('Output directory is required');
   await parseYamlFile(inputFile, outputDir);
}
