// src/process-xano/core/parseYamlFile.js
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { prettyLog } from '../utils/console/prettify.js';
import { rebuildDirectoryStructure } from '../utils/fs/index.js';

/**
 * Reads and parses the YAML file, then rebuilds the directory structure.
 */
function parseYamlFile(inputFilePath, outputDir) {
   try {
      prettyLog(`Reading and parsing YAML file -> ${inputFilePath}`, 'info');
      const fileContents = readFileSync(inputFilePath, 'utf8');
      const jsonData = load(fileContents);
      rebuildDirectoryStructure(jsonData, outputDir);
   } catch (error) {
      prettyLog('Error reading or parsing YAML file.', 'error', error);
   }
}

export { parseYamlFile };
