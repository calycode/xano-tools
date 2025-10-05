import { processItem } from './core/processItem';
import { sanitizeFileName } from '@repo/utils';
import { generateStructureDiagrams } from './core/generate-structure-diagrams';
import type { Caly } from '../../';

const buildMapping = (entities, keyBuilder) =>
   Array.isArray(entities)
      ? entities.reduce((acc, item) => {
           const key = item.guid;
           if (key) acc[key] = keyBuilder(item);
           return acc;
        }, {})
      : {};

async function rebuildDirectoryStructure(jsonData, core: Caly) {
   const { dbo, app, query, function: func, addon, trigger, task, middleware } = jsonData.payload;

   core.emit('start', { name: 'generate-repo', payload: null });

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

   // Gather all items to process for progress tracking
   const allItems = Object.entries(structure).flatMap(([key, value]) =>
      (Array.isArray(value) ? value : [value]).filter(Boolean).map((item) => ({ key, item }))
   );

   const totalSteps = allItems.length;
   let step = 0;
   let stagedProcessOutput = [];

   for (const { key, item } of allItems) {
      step++;
      core.emit('progress', {
         name: 'generate-repo-progress',
         message: `Processing ${key}: ${item.name || '[unnamed]'}`,
         step,
         totalSteps,
         percent: Math.round((step / totalSteps) * 100),
         payload: { key, item },
      });
      stagedProcessOutput = [
         ...stagedProcessOutput,
         ...processItem({
            key,
            item,
            dirPath: key,
            appMapping,
            appQueries,
            functionMapping,
            dboMapping,
         }),
      ];
   }

   core.emit('end', { name: 'generate-repo', payload: null });

   return [
      ...stagedProcessOutput,
      ...generateStructureDiagrams(appQueries, appMapping, appDescriptions),
   ];
}

export { rebuildDirectoryStructure };
