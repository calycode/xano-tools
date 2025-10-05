import { joinPath } from '@repo/utils';

type Query = Partial<{ name: string; verb: string }>;
type AppQueries = Record<string, Query[]>;

/**
 * Generates structure diagrams for each app and returns README.md file objects.
 * @param appQueries - Mapping of app IDs to their queries.
 * @param appMapping - Mapping of app IDs to app names.
 * @param appDescriptions - Mapping of app IDs to app descriptions.
 */
function generateStructureDiagrams(
   appQueries: AppQueries,
   appMapping: Record<string, string>,
   appDescriptions: Record<string, string>
): { path: string; content: string }[] {
   const outputs: { path: string; content: string }[] = [];

   for (const [appId, queries] of Object.entries(appQueries)) {
      const appName = appMapping[appId] || `app_${appId}`;
      const appDir = joinPath('app', appName);
      const readmePath = joinPath(appDir, 'README.md');
      const appDescription = appDescriptions[appId] || '//...';

      let structureDiagram = `# ${appName}\n\n${appDescription}\n\n## Structure\n\n`;

      // Group queries by their base path
      const grouped: Record<string, Query[]> = {};
      for (const query of queries) {
         const parts = (query.name ?? '').split('/');
         const basePath = parts.length > 1 ? parts.slice(0, -1).join('/') : '/';
         if (!grouped[basePath]) grouped[basePath] = [];
         grouped[basePath].push(query);
      }

      // Generate the diagram
      for (const [basePath, queries] of Object.entries(grouped)) {
         structureDiagram += basePath !== '/' ? `- **${basePath}**\n` : '';
         for (const query of queries) {
            const qPath = `/${query.name}`;
            const qLink = `[${qPath}](./${query.name}/${query.verb})`;
            structureDiagram += `${basePath !== '/' ? '  ' : ''}- ${query.verb}: ${qLink}\n`;
         }
      }

      outputs.push({ path: readmePath, content: structureDiagram });
   }

   return outputs;
}

export { generateStructureDiagrams };
