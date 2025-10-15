import { generateQueryLogicDescription } from './generateRunReadme';
import { convertXanoDBDescription } from '../adapters/dbmlGenerator';
import { sanitizeFileName, joinPath } from '@repo/utils';

function getItemDir({ key, item, dirPath, appMapping }) {
   let baseDir;
   let itemName = item.name || 'unnamed';

   if (key === 'query' && item.app?.id) {
      const appName = appMapping[item.app.id] || `app_${item.app.id}`;
      baseDir = joinPath('app', appName, sanitizeFileName(itemName));
   } else if (key === 'app') {
      baseDir = joinPath(dirPath, itemName);
   } else {
      baseDir = joinPath(dirPath, sanitizeFileName(itemName));
   }

   // Queries may have a verb subfolder
   if (key === 'query' && item.verb) {
      baseDir = joinPath(baseDir, item.verb);
   }
   return baseDir;
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
