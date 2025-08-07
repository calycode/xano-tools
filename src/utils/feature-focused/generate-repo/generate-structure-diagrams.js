import { join } from 'path';
import { writeFileSync } from 'fs';

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

export { generateStructureDiagrams };
