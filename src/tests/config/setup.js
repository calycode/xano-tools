import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config();

const API_SPEC_TOKEN = process.env.API_SPEC_TOKEN;
const LOCAL_SETUP_PATH = process.env.LOCAL_SETUP_PATH;

const fetchEndpointsToTest = async () => {

   let result = [];

   if (!LOCAL_SETUP_PATH) {
      try {
         const response = await fetch(`https://your-remote-test-setuplink.com`, {
            method: 'GET',
            headers: {
               'Content-Type': 'application/json',
            },
         });
         result = await response.json();
      } catch (error) {
         console.error('Failed to fetch endpoints to test:', error);
         throw error;
      }
   } else {
      try {
         const localData = await fs.readFile(LOCAL_SETUP_PATH, 'utf8');
         result = JSON.parse(localData);
      } catch (e) {
         console.error('Failed to fetch endpoints to test from local:', e);
         throw e;
      }
   }

   return result;

};

const endpointsToTest = await fetchEndpointsToTest();

export { endpointsToTest, fetchEndpointsToTest };
