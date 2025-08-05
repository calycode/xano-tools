import AdmZip from 'adm-zip';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { metaApiRequestBlob } from '../metadata/api-helper.js';
import { spinner } from '@clack/prompts';

export async function fetchAndExtractYaml({ baseUrl, token, workspaceId, branchLabel, outDir }) {
   // 1. Download the zip blob
   spinner().start('Fetching workspace schema...')
   const zipBuffer = await metaApiRequestBlob({
      baseUrl,
      token,
      method: 'POST',
      path: `/workspace/${workspaceId}/export-schema`,
      body: { branch: branchLabel },
   });

   // 2. Write zip to temp file
   const zipPath = join(outDir, `workspace-export-${Date.now()}.zip`);
   writeFileSync(zipPath, zipBuffer);

   // 3. Extract .yaml from zip
   const zip = new AdmZip(zipPath);
   const zipEntries = zip.getEntries();
   const yamlEntry = zipEntries.find((e) => e.entryName.endsWith('.yaml'));
   if (!yamlEntry) throw new Error('No .yaml found in the exported zip!');
   const yamlFilePath = join(outDir, yamlEntry.entryName);
   zip.extractEntryTo(yamlEntry.entryName, outDir, false, true);

   spinner().stop('Workspace schema fetched!');

   return yamlFilePath;
}
