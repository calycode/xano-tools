import { spinner } from '@clack/prompts';
import { metaApiRequestBlob } from './api-helper';
import { FetchAndExtractYamlArgs } from '../../../types';
import { joinPath, dirname } from '..';

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
   const s = spinner();
   s.start('Fetching workspace schema...');

   const tarGzBuffer = await metaApiRequestBlob({
      baseUrl,
      token,
      method: 'POST',
      path: `/workspace/${workspaceId}/export-schema`,
      body: { branch: branchLabel },
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
   const yamlFile = files.find((f) => f.endsWith('.yaml'));
   if (!yamlFile) throw new Error('No .yaml found in the exported archive!');
   const yamlFilePath = joinPath(outDir, yamlFile);

   s.stop('Workspace schema fetched!');

   return yamlFilePath;
}
