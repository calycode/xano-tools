// src/process-xano/utils/fs/fetchWroskapceYaml.js
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { x } from 'tar';
import { prettyLog } from '../console/prettify.js';
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
      prettyLog('Using local workspace YAML file...', 'info');
      const localYamlFilePath = join(yamlFilesDir, `${branchName}.yaml`);
      if (existsSync(localYamlFilePath)) {
         prettyLog('Local workspace YAML file found.', 'info');
         return localYamlFilePath;
      } else {
         prettyLog('Please make sure the file exists.', 'error');
         throw new Error('Local workspace YAML file not found');
      }
   } else {
      try {
         prettyLog(
            'Starting to fetch workspace YAML from Google Cloud bucket signed URL...',
            'info'
         );
         prettyLog('URL:', 'info', url);
         const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer',
         });

         // Check if the response is successful
         if (response.status < 200 || response.status >= 300) {
            prettyLog('Failed to fetch the Workspace file.', 'error');
            throw new Error(`Failed to fetch YAML file: ${response.status} ${response.statusText}`);
         }

         // Save the downloaded file to disk for inspection
         if (!existsSync(yamlFilesDir)) {
            mkdirSync(yamlFilesDir, { recursive: true });
         }

         const tarGzFilePath = join(yamlFilesDir, `${branchName}_workspace.tar.gz`);
         writeFileSync(tarGzFilePath, response.data);
         prettyLog('Workspace YAML file fetched successfully.', 'info');

         // Extract the .tar.gz file
         try {
            await x({ file: tarGzFilePath, cwd: yamlFilesDir });
            prettyLog('Workspace YAML file extracted successfully.', 'info');
         } catch (extractError) {
            prettyLog('Error extracting the tar.gz file.', 'error');
            throw extractError;
         }

         // Verify the extracted files
         const extractedFiles = readdirSync(yamlFilesDir);
         prettyLog('Extracted files:', 'info', extractedFiles);

         // Find the extracted YAML file
         const yamlFilePath = extractedFiles.find((file) => file.endsWith('.yaml'));
         if (!yamlFilePath) {
            throw new Error('No YAML file found after extraction');
         }

         const fullYamlFilePath = join(yamlFilesDir, yamlFilePath);

         prettyLog('Workspace YAML file path:', 'info', fullYamlFilePath);

         return fullYamlFilePath;
      } catch (error) {
         if (error.response) {
            prettyLog(
               `Error fetching YAML: ${error.response.status} - ${error.response.data}`,
               'error'
            );
         } else {
            prettyLog(`Error: ${error.message}`, 'error');
         }
         if (retries > 0 && error.code === 'ECONNRESET') {
            console.warn(`Connection reset. Retrying... (${3 - retries + 1}/3)`);
            prettyLog(
               'Retrying to fetch workspace YAML...',
               'warning',
               `Retrying... (${3 - retries + 1}/3)`
            );
            return fetchWorkspaceYaml(branchName, url, retries - 1);
         } else {
            prettyLog('Error fetching workspace YAML.', 'error');
            throw error;
         }
      }
   }
}

export { fetchWorkspaceYaml };
