// src/process-xano/utils/fs/index.js
import {
   existsSync,
   readdirSync,
   lstatSync,
   rmdirSync,
   unlinkSync,
   writeFileSync,
   mkdirSync,
} from 'fs';
import { join } from 'path';
import { processItem } from '../../core/processItem.js';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import { outro } from '@clack/prompts';

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
 * Generates structure diagrams for each app and writes them to README.md files.
 * @param {object} appQueries - A mapping of app IDs to their queries.
 * @param {object} appMapping - A mapping of app IDs to app names.
 * @param {object} appDescriptions - A mapping of app IDs to app descriptions.
 */
function generateStructureDiagrams(appQueries, appMapping, appDescriptions, outputDir) {
   for (const [appId, queries] of Object.entries(appQueries)) {
      const appName = appMapping[appId] || `app_${appId}`;
      const appDir = join(outputDir, 'app', appName);
      const readmePath = join(appDir, 'README.md');
      const appDescription = appDescriptions[appId] || '//...';

      let structureDiagram = `# ${appName}\n\n${appDescription}\n\n## Structure\n\n`;

      // Group queries by their common path parts
      const groupedQueries = queries.reduce((acc, query) => {
         const parts = query.name.split('/');
         const basePath = parts.slice(0, -1).join('/');
         if (!acc[basePath]) {
            acc[basePath] = [];
         }
         acc[basePath].push(query);
         return acc;
      }, {});

      // Generate the structure diagram
      for (const [basePath, queries] of Object.entries(groupedQueries)) {
         structureDiagram += `- **${basePath}**\n`;
         queries.forEach((query) => {
            const queryPath = `/${query.name}`;
            const queryLink = `[${queryPath}](./${query.name}/${query.verb})`;
            structureDiagram += `  - ${query.verb}: ${queryLink}\n`;
         });
      }

      writeFileSync(readmePath, structureDiagram);
   }
}

function sanitizeFileName(fileName) {
   return fileName
      .replace(/[:\s\[\]\(\)]+/g, '_') // Replace invalid characters with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with a single underscore
      .replace(/^_+|_+$/g, '') // Remove leading and trailing underscores
      .replace(/[?,]+/g, '_'); // Replace ? and , with underscores
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
         };
      });
   }

   const dboMapping = {};
   if (Array.isArray(structure.dbo)) {
      structure.dbo.forEach((dbo) => {
         dboMapping[dbo.guid] = {
            name: dbo.name,
            path: `dbo/${sanitizeFileName(dbo.name)}`,
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

         value.forEach((item, idx) => {
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

export { sanitizeFileName, rebuildDirectoryStructure };
