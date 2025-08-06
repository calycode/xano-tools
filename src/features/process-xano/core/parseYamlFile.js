// src/process-xano/core/parseYamlFile.js
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { log } from '@clack/prompts';
import { rebuildDirectoryStructure } from '../utils/fs/index.js';

/**
 * Reads and parses the YAML file, then rebuilds the directory structure.
 */
function parseYamlFile(inputFilePath, outputDir) {
   try {
      log.step(`Reading and parsing YAML file -> ${inputFilePath}`);
      const fileContents = readFileSync(inputFilePath, 'utf8');
      const jsonData = load(fileContents);
      rebuildDirectoryStructure(jsonData, outputDir);
   } catch (error) {
      log.error(`Error reading or parsing YAML file: ${error.message}`);
   }
}

export { parseYamlFile };
