// src/process-xano/core/processItem.js
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { generateQueryLogicDescription } from '../core/generateRunReadme.js';
import { convertXanoDBDescription } from '../adapters/dbmlGenerator.js';
import { sanitizeFileName } from '../../../utils/index.js';

/**
 * Processes an individual item and writes it to the appropriate directory.
 * @param {string} key - The key representing the type of item (e.g., 'query').
 * @param {object} item - The item to process.
 * @param {string} dirPath - The base directory path for the item.
 * @param {object} appMapping - A mapping of app IDs to app names.
 * @param {object} appQueries - A mapping of app IDs to their queries.
 * @param {object} functionMapping - A mapping of function IDs to their paths.
 * @param {object} dboMapping - A mapping of dbo IDs to their paths.
 */
function processItem({
   key,
   item,
   dirPath,
   appMapping,
   appQueries,
   functionMapping,
   dboMapping,
   outputDir,
}) {
   let itemName = item.name || 'unnamed';
   const itemGuid = item.guid || 'no-guid';
   let itemDir;

   // Check if the item is a query and has an app.id
   if (key === 'query' && item.app && item.app.id) {
      const appName = appMapping[item.app.id] || `app_${item.app.id}`;

      // create the appDir if it doesn't exist yet.
      const appDir = join(outputDir, 'app', appName);
      if (!existsSync(appDir)) {
         mkdirSync(appDir, { recursive: true });
      }
      
      itemDir = join(appDir, sanitizeFileName(itemName));

      // Add query to appQueries for structure diagram
      if (!appQueries[item.app.id]) {
         appQueries[item.app.id] = [];
      }
      appQueries[item.app.id].push({
         name: itemName,
         verb: item.verb,
         description: item.description,
      });
   } else {
      itemDir = join(dirPath, sanitizeFileName(itemName)); // Create nested directories
   }

   if (!existsSync(itemDir)) {
      mkdirSync(itemDir, { recursive: true });
   }

   // Create subfolders for each HTTP verb
   if (key === 'query' && item.verb) {
      const verbDir = join(itemDir, item.verb);
      if (!existsSync(verbDir)) {
         mkdirSync(verbDir, { recursive: true });
      }
      itemDir = verbDir;
   }

   const itemJsonPath = join(itemDir, `${itemGuid}.json`);
   writeFileSync(itemJsonPath, JSON.stringify(item, null, 2));

   const readmePath = join(itemDir, 'README.md');
   const description = item.description || '//...';

   // Generate query logic description for queries and functions only.
   if (key === 'query' || key === 'function') {
      const queryLogicDescription = generateQueryLogicDescription(
         item.run,
         0,
         functionMapping,
         dboMapping
      );
      writeFileSync(
         readmePath,
         `# ${itemName}\n\n${description}\n\n## Query logic description\n\n${queryLogicDescription}`
      );
   }

   // Generate DBML and SQL for dbo
   if (key === 'dbo') {
      const processedTableDescription = convertXanoDBDescription(item);

      // Write DBML and SQL to README
      writeFileSync(
         readmePath,
         `
# ${itemName}

${description}

${processedTableDescription}
`
      );
   }
}

export { processItem };
