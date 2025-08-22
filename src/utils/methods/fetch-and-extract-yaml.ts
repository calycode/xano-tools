import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { spinner } from '@clack/prompts';
// [ ] Refactor to use js-untar or untar.js to allow for use in non-node environments
import { x } from 'tar';
import { metaApiRequestBlob } from '../../core/utils/methods/api-helper';
import { FetchAndExtractYamlArgs } from '../../types';

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

   const tarGzPath = resolve(outDir, `workspace-schema-export-${Date.now()}.tar.gz`);
   await fs.writeFile(tarGzPath, tarGzBuffer);

   // Extract .tar.gz using tar
   await x({
      file: tarGzPath,
      cwd: outDir,
   });

   // Optionally clean up the archive file
   await fs.unlink(tarGzPath).catch(() => {});

   // Find the .yaml file inside outDir
   const files = await fs.readdir(outDir);
   const yamlFile = files.find((f) => f.endsWith('.yaml'));
   if (!yamlFile) throw new Error('No .yaml found in the exported archive!');
   const yamlFilePath = join(outDir, yamlFile);

   s.stop('Workspace schema fetched!');

   return yamlFilePath;
}
