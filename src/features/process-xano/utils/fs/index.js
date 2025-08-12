// src/process-xano/utils/fs/index.js
import {
   existsSync,
   readdirSync,
   lstatSync,
   rmdirSync,
   unlinkSync,
   mkdirSync,
} from 'fs';
import { join } from 'path';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import { outro } from '@clack/prompts';
import { processItem } from '../../core/processItem.js';
import { sanitizeFileName, generateStructureDiagrams } from '../../../../utils/index.js';

// Helper for padding keys
function padRight(str, len) {
  return str.padEnd(len, ' ');
}

/**
 * Clears the contents of a directory.
 * @param {string} directory - The directory to clear.
 */
function clearDirectory(directory) {
   if (existsSync(directory)) {
      readdirSync(directory).forEach((file) => {
         const curPath = join(directory, file);
         if (lstatSync(curPath).isDirectory()) {
            clearDirectory(curPath);
            rmdirSync(curPath);
         } else {
            unlinkSync(curPath);
         }
      });
   }
}

/**
 * Rebuilds the directory structure and splits JSON objects into separate files.
 * @param {object} jsonData - The JSON data parsed from the YAML file.
 */
function rebuildDirectoryStructure(jsonData, outputDir) {
   // Ensure the output directory exists and clear its contents
   if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
   } else {
      clearDirectory(outputDir);
   }

   const structure = {
      dbo: jsonData.payload.dbo,
      app: jsonData.payload.app,
      query: jsonData.payload.query,
      function: jsonData.payload.function,
      addon: jsonData.payload.addon,
      trigger: jsonData.payload.trigger,
      task: jsonData.payload.task,
      middleware: jsonData.payload.middleware,
   };

   // Find the longest key for alignment
   const maxKeyLen = Math.max(...Object.keys(structure).map((k) => k.length));

   // Create a mapping of app.id to app.name and app.description
   const appMapping = {};
   const appDescriptions = {};
   // Create a mapping of app.id to queries for structure diagrams
   const appQueries = {};

   if (Array.isArray(structure.app)) {
      structure.app.forEach((app) => {
         if (app.guid && app.name) {
            appMapping[app.guid] = app.name.replace(/\//g, '_'); // Replace "/" with "_" in app name
            appDescriptions[app.guid] = app.description || '//...';
         }
      });
   }

   const functionMapping = {};
   if (Array.isArray(structure.function)) {
      structure.function.forEach((func) => {
         functionMapping[func.guid] = {
            name: func.name,
            path: `function/${sanitizeFileName(func.name)}`,
            description: func.description ?? '',
         };
      });
   }

   const dboMapping = {};
   if (Array.isArray(structure.dbo)) {
      structure.dbo.forEach((dbo) => {
         dboMapping[dbo.guid] = {
            name: dbo.name,
            path: `dbo/${sanitizeFileName(dbo.name)}`,
            description: dbo.description ?? '',
         };
      });
   }

   // For each entity type, show a progress bar
   for (const [key, value] of Object.entries(structure)) {
      const dirPath = join(outputDir, key);
      if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

      if (Array.isArray(value) && value.length > 0) {
         // Setup progress bar for this type
         const bar = new cliProgress.SingleBar({
            format: `⌛   ${chalk.blue(padRight(key, maxKeyLen))} |{bar}| {value}/{total}`,
            barCompleteChar: '=',
            barIncompleteChar: '-',
            barGlue: '',
            barsize: 20, // thinner bar
            hideCursor: true,
            linewrap: false,
         });

         bar.start(value.length, 0, { itemName: '' });

         value.forEach((item) => {
            processItem({
               key,
               item,
               dirPath,
               appMapping,
               appQueries,
               functionMapping,
               dboMapping,
               outputDir,
            });
            bar.increment(1, { itemName: item.name || '' });
         });

         bar.stop();
      } else if (value) {
         processItem({
            key,
            item: value,
            dirPath,
            appMapping,
            appQueries,
            functionMapping,
            dboMapping,
            outputDir,
         });
      }
   }

   generateStructureDiagrams(appQueries, appMapping, appDescriptions, outputDir);

   outro('Directory structure rebuilt successfully!');
}

export { rebuildDirectoryStructure };
