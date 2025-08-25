// src/cli/features/process-xano/core/processItem.js
import { joinPath } from '../../../utils';
import { generateQueryLogicDescription } from './generateRunReadme';
import { convertXanoDBDescription } from '../adapters/dbmlGenerator';
import { sanitizeFileName } from '../../../../cli/utils';

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
}): { path: string; content: string }[] {
   const processedContent: { path: string; content: string }[] = [];

   let itemName = item.name || 'unnamed';
   const itemGuid = item.guid || 'no-guid';
   let itemDir;

   // Check if the item is a query and has an app.id
   if (key === 'query' && item.app && item.app.id) {
      const appName = appMapping[item.app.id] || `app_${item.app.id}`;

      // create the appDir if it doesn't exist yet.
      const appDir = joinPath('app', appName);

      itemDir = joinPath(appDir, sanitizeFileName(itemName));

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
      itemDir = joinPath(dirPath, sanitizeFileName(itemName)); // Create nested directories
   }

   // Create subfolders for each HTTP verb
   if (key === 'query' && item.verb) {
      const verbDir = joinPath(itemDir, item.verb);
      itemDir = verbDir;
   }

   const itemJsonPath = joinPath(itemDir, `${itemGuid}.json`);

   processedContent.push({ path: itemJsonPath, content: JSON.stringify(item, null, 2) });

   const readmePath = joinPath(itemDir, 'README.md');
   const description = item.description || '//...';

   // Generate query logic description for queries and functions only.
   if (key === 'query' || key === 'function') {
      const queryLogicDescription = generateQueryLogicDescription(
         item.run,
         0,
         functionMapping,
         dboMapping
      );

      const readmeContent = `
# ${itemName}

${description}

## Steps

${queryLogicDescription}
      `;

      processedContent.push({
         path: readmePath,
         content: readmeContent,
      });
   }

   // Generate DBML and SQL for dbo
   if (key === 'dbo') {
      const processedTableDescription = convertXanoDBDescription(item);
      const readmeContent = `
# ${itemName}

${description}

${processedTableDescription}
`;

      processedContent.push({
         path: readmePath,
         content: readmeContent,
      });
   }

   return processedContent;
}

export { processItem };
