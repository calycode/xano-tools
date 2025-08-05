// src/process-xano/utils/fs/fetchWroskapceYaml.js
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { x } from 'tar';
import { log } from '@clack/prompts';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const __dirname = import.meta.dirname;
const yamlFilesDir = resolve(__dirname, '../../../../yaml-files');
const useLocalYaml = process.env.USE_LOCAL_YAML === 'true';

/**
 * Fetches the workspace YAML file from the API and extracts it.
 * @param {string} branchName - The name of the branch.
 * @param {string} url - The URL to fetch the YAML file from.
 * @param {number} retries - The number of retry attempts.
 */
async function fetchWorkspaceYaml(branchName, url, retries = 3) {
   if (useLocalYaml) {
      log.message('Using local workspace YAML file...');
      const localYamlFilePath = join(yamlFilesDir, `${branchName}.yaml`);
      if (existsSync(localYamlFilePath)) {
         log.info('Local workspace YAML file found.');

         return localYamlFilePath;
      } else {
         log.error('Please make sure the file exists.')

         throw new Error('Local workspace YAML file not found');
      }
   } else {
      try {
         log.step('Starting to fetch workspace YAML from Google Cloud bucket signed URL...');
         log.message(`URL: ${url}`);
         const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer',
         });

         // Check if the response is successful
         if (response.status < 200 || response.status >= 300) {
            log.error('Failed to fetch the Workspace file.');

            throw new Error(`Failed to fetch YAML file: ${response.status} ${response.statusText}`);
         }

         // Save the downloaded file to disk for inspection
         if (!existsSync(yamlFilesDir)) {
            mkdirSync(yamlFilesDir, { recursive: true });
         }

         const tarGzFilePath = join(yamlFilesDir, `${branchName}_workspace.tar.gz`);
         writeFileSync(tarGzFilePath, response.data);

         log.step('Workspace YAML file fetched successfully.');

         // Extract the .tar.gz file
         try {
            await x({ file: tarGzFilePath, cwd: yamlFilesDir });
            log.step('Workspace YAML file extracted successfully.');
         } catch (extractError) {
            log.error('Error extracting the tar.gz file.');
            throw extractError;
         }

         // Verify the extracted files
         const extractedFiles = readdirSync(yamlFilesDir);
         log.step(`Extracted files: ${extractedFiles}`);

         // Find the extracted YAML file
         const yamlFilePath = extractedFiles.find((file) => file.endsWith('.yaml'));
         if (!yamlFilePath) {
            throw new Error('No YAML file found after extraction');
         }

         const fullYamlFilePath = join(yamlFilesDir, yamlFilePath);


         log.message(`Workspace YAML file path: ${fullYamlFilePath}`);

         return fullYamlFilePath;
      } catch (error) {
         if (error.response) {
            log.error(`Error fetching YAML: ${error.response.status} - ${error.response.data}`);
         } else {
            log.error(`Error: ${error.message}`);
         }
         if (retries > 0 && error.code === 'ECONNRESET') {
            console.warn(`Connection reset. Retrying... (${3 - retries + 1}/3)`);
            log.step(`Retrying to fetch workspace YAML... (${3 - retries + 1}/3)`);

            return fetchWorkspaceYaml(branchName, url, retries - 1);
         } else {
            log.error(`Error: ${error.message}`);
            throw error;
         }
      }
   }
}

export { fetchWorkspaceYaml };
