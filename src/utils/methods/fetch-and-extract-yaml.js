import { writeFileSync } from 'fs';
import { join } from 'path';
import fs from 'fs/promises';
import { spinner } from '@clack/prompts';
import { x } from 'tar';
import { metaApiRequestBlob } from './api-helper.js';

export async function fetchAndExtractYaml({ baseUrl, token, workspaceId, branchLabel, outDir }) {
   const s = spinner();
   s.start('Fetching workspace schema...');
   const tarGzBuffer = await metaApiRequestBlob({
      baseUrl,
      token,
      method: 'POST',
      path: `/workspace/${workspaceId}/export-schema`,
      body: { branch: branchLabel },
   });

   const tarGzPath = join(outDir, `workspace-schema-export-${Date.now()}.tar.gz`);

   writeFileSync(tarGzPath, tarGzBuffer);

   // Extract .tar.gz using tar
   await x({
      file: tarGzPath,
      cwd: outDir,
   });

   // Find the .yaml file inside outDir
   const files = await fs.readdir(outDir);
   const yamlFile = files.find((f) => f.endsWith('.yaml'));
   if (!yamlFile) throw new Error('No .yaml found in the exported archive!');
   const yamlFilePath = join(outDir, yamlFile);

   s.stop('Workspace schema fetched!');

   return yamlFilePath;
}
