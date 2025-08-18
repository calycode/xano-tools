// src/process-xano/index.js

import { parseYamlFile } from './core/parseYamlFile';

export function processWorkspace({ inputFile, outputDir }) {
   // Validate arguments here
   if (!inputFile) throw new Error('Input YAML file is required');
   if (!outputDir) throw new Error('Output directory is required');
   parseYamlFile(inputFile, outputDir);
}
