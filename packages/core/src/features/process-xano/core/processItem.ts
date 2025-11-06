import { generateQueryLogicDescription } from './generateRunReadme';
import { convertXanoDBDescription } from '../adapters/dbmlGenerator';
import { sanitizeFileName, joinPath } from '@repo/utils';

/**
 * Determines the target directory path for a given schema item, normalizing names for human-friendly structure.
 * Handles special cases for item types (e.g., 'dbo', 'query', 'trigger') and integrates API group mappings.
 *
 * @param {string} key - The schema item type (e.g., 'dbo', 'query', 'app', 'trigger').
 * @param {Object} item - The schema item object, with metadata and Xano schema.
 * @param {string} dirPath - The base directory path for output.
 * @param {Object} appMapping - Maps app IDs to human-friendly names.
 * @returns {string} The computed directory path for the item.
 */
function getItemDir({
   key,
   item,
   dirPath,
   appMapping,
}: {
   key: string;
   item: any;
   dirPath: string;
   appMapping: Record<string, string>;
}): string {
   // Get a safe, human-friendly item name
   const itemName = sanitizeFileName(item.name ?? 'unnamed');

   // Compute the base directory depending on the item type
   switch (key) {
      case 'query': {
         // Use mapped app name if available
         const appId = item.app?.id;
         const appName = appId ? sanitizeFileName(appMapping[appId] ?? `app_${appId}`) : undefined;
         let baseDir = appId ? joinPath('app', appName, itemName) : joinPath(dirPath, itemName);
         // Add verb subfolder if present
         if (item.verb) baseDir = joinPath(baseDir, item.verb);
         return baseDir;
      }
      case 'app':
         return joinPath(dirPath, itemName);
      case 'dbo':
         return joinPath('table', itemName);
      case 'trigger':
         if (item.obj_type === 'database') {
            return joinPath('table', key, itemName);
         }
         return joinPath(dirPath, itemName);
      default:
         return joinPath(dirPath, itemName);
   }
}

function makeReadmeContent({ key, item, functionMapping, dboMapping }) {
   const description = item.description || '//...';
   const itemName = item.name || 'unnamed';

   if (key === 'query' || key === 'function') {
      const steps = generateQueryLogicDescription(item.run, 0, functionMapping, dboMapping);
      return `
# ${itemName}

${description}

## Steps

${steps}
    `;
   }

   if (key === 'dbo') {
      const tableDesc = convertXanoDBDescription(item);
      return `
# ${itemName}

${description}

${tableDesc}
    `;
   }

   return null;
}

/**
 * Processes an individual item and outputs file objects.
 */
function processItem({ key, item, dirPath, appMapping, appQueries, functionMapping, dboMapping }) {
   const processedContent = [];
   const itemDir = getItemDir({ key, item, dirPath, appMapping });
   const itemGuid = item.guid || 'no-guid';

   // Track queries for structure diagrams
   if (key === 'query' && item.app?.id) {
      appQueries[item.app.id] = appQueries[item.app.id] || [];
      appQueries[item.app.id].push({
         name: item.name || 'unnamed',
         verb: item.verb,
         description: item.description,
      });
   }

   // Always output JSON
   processedContent.push({
      path: joinPath(itemDir, `${itemGuid}.json`),
      content: JSON.stringify(item, null, 2),
   });

   // Optionally output README if relevant
   const readmeContent = makeReadmeContent({ key, item, functionMapping, dboMapping });
   if (readmeContent) {
      processedContent.push({
         path: joinPath(itemDir, 'README.md'),
         content: readmeContent,
      });
   }

   return processedContent;
}

export { processItem };
