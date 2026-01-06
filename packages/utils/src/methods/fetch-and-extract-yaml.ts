import { metaApiRequestBlob } from './api-helper';
import { FetchAndExtractYamlArgs } from '@repo/types';
import { joinPath, dirname } from './path';

// [ ] CORE
/**
 * Fetches a workspace schema archive from the API,
 * extracts it, and returns the path to the YAML file.
 */
export async function fetchAndExtractYaml({
   baseUrl,
   token,
   workspaceId,
   branchLabel,
   outDir,
   core,
}: FetchAndExtractYamlArgs): Promise<string> {
   core.emit('progress', {
      name: 'fetch-extract-yaml',
      message: 'Fetching workspace schema...',
      percent: 5,
   });

   const tarGzBuffer = await metaApiRequestBlob({
      baseUrl,
      token,
      method: 'POST',
      path: `/workspace/${workspaceId}/export-schema`,
      body: { branch: branchLabel },
   });

   core.emit('progress', {
      name: 'fetch-extract-yaml',
      message: 'Downloaded workspace schema, extracting...',
      percent: 80,
   });

   // Environment agnostic extract
   const extractedTars = await core.storage.tarExtract(tarGzBuffer);
   await Promise.all(
      Object.keys(extractedTars).map(async (filePath) => {
         const newPath = joinPath(outDir, filePath);
         await core.storage.mkdir(dirname(newPath), { recursive: true });
         await core.storage.writeFile(newPath, extractedTars[filePath]);
      })
   );

   // Find the .yaml file inside outDir
   const files: string[] = await core.storage.readdir(outDir);
   const schemaFile = files.find((f) => f.endsWith('.json') || f.endsWith('.yaml'));

   if (!schemaFile) {
      throw new Error(
         `No schema file (.json or .yaml) found in the exported archive! Found: ${files.join(', ')}`
      );
   }
   const schemaFilePath = joinPath(outDir, schemaFile);

   core.emit('progress', {
      name: 'fetch-extract-yaml',
      message: 'Extracted workspace schema!',
      percent: 100,
   });

   return schemaFilePath;
}
