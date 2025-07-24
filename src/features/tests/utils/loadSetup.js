// src/tests/utils/loadSetup.js
import fs from 'fs/promises';

export async function loadSetupFile(setupPath) {
   if (!setupPath) throw new Error('No setup file specified');
   const data = await fs.readFile(setupPath, 'utf8');
   return JSON.parse(data);
}
