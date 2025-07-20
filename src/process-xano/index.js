// src/process-xano/index.js

import { parseYamlFile } from './core/parseYamlFile.js';
import { prettyLog } from './utils/console/prettify.js';

export async function processWorkspace({inputFile, outputDir}) {
   // Validate arguments here
   if (!inputFile) throw new Error('Input YAML file is required');
   if (!outputDir) throw new Error('Output directory is required');
   prettyLog('Beginning workspace processing...', 'info');
   await parseYamlFile(inputFile, outputDir);
}



// --------------------- LEGACY TO BE REMOVED ----------------- //
/*
import { fetchWorkspaceYaml } from './utils/fs/fetchWorkspaceYaml.js';
import dotenv from 'dotenv';
dotenv.config();

// --- Configuration ---
// Group configuration from environment variables for clarity and easy management.
const config = {
   branchName: process.env.BRANCH_NAME,
   branchUrl: process.env.BRANCH_URL,
   useLocalYaml: (process.env.USE_LOCAL_YAML || 'false').toLowerCase() === 'true',
   retries: 2,
};

async function main() {
   let filePath = '';
   try {
      if (config.useLocalYaml) {
         prettyLog('Processing local YAML file is not yet implemented.', 'warn');
         filePath = await fetchWorkspaceYaml(
            config.branchName,
            config.branchUrl,
            config.retries
         );
      }

      // Validate required environment variables for remote fetch.
      if (config.branchName && config.branchUrl) {
         prettyLog(`Fetching workspace for branch: ${config.branchName}`, 'info');
         filePath = await fetchWorkspaceYaml(config.branchName, config.branchUrl, config.retries);
      }

      if (!filePath) {
         prettyLog('Failed to fetch or save the workspace YAML file.', 'error');
         process.exit(1);
      }

      prettyLog(`Workspace YAML saved to: ${filePath}`, 'info');
      parseYamlFile(filePath);
      prettyLog('Successfully processed workspace YAML.', 'success');
   } catch (error) {
      prettyLog('An unexpected error occurred during the main process.', 'error');
      console.error(error);
      process.exit(1);
   }
}

// Run the main function
main();
*/