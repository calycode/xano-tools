import { processItem } from './core/processItem';
import { sanitizeFileName, generateStructureDiagrams } from '../../../cli/utils';

/**
 * Helper to build a lookup mapping for entities.
 */
const buildMapping = (entities, keyBuilder) =>
   Array.isArray(entities)
      ? entities.reduce((acc, item) => {
           const key = item.guid;
           if (key) acc[key] = keyBuilder(item);
           return acc;
        }, {})
      : {};

function rebuildDirectoryStructure(jsonData) {
   const { dbo, app, query, function: func, addon, trigger, task, middleware } = jsonData.payload;

   // Mappings
   const appMapping = buildMapping(app, (a) => a.name.replace(/\//g, '_'));
   const appDescriptions = buildMapping(app, (a) => a.description || '//...');
   const functionMapping = buildMapping(func, (f) => ({
      name: f.name,
      path: `function/${sanitizeFileName(f.name)}`,
      description: f.description ?? '',
   }));
   const dboMapping = buildMapping(dbo, (d) => ({
      name: d.name,
      path: `dbo/${sanitizeFileName(d.name)}`,
      description: d.description ?? '',
   }));
   const appQueries = {};

   const structure = { dbo, app, query, function: func, addon, trigger, task, middleware };

   // Process all entity types in structure
   const stagedProcessOutput = Object.entries(structure).flatMap(([key, value]) =>
      (Array.isArray(value) ? value : [value]).filter(Boolean).flatMap((item) =>
         processItem({
            key,
            item,
            dirPath: key,
            appMapping,
            appQueries,
            functionMapping,
            dboMapping,
         })
      )
   );

   return [
      ...stagedProcessOutput,
      ...generateStructureDiagrams(appQueries, appMapping, appDescriptions),
   ];
}

export { rebuildDirectoryStructure };
