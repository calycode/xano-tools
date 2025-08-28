// src/lint-xano/index.js
import fs from 'fs/promises';
import path from 'path';
import { log, spinner } from '@clack/prompts';
import XanoLinter from './XanoLinter';

// [ ] CORE, needs fs
async function runLinterOnJsonFiles({ dirPath, lintResults, ruleConfig }) {
   const files = await fs.readdir(dirPath);

   for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
         await runLinterOnJsonFiles({ dirPath: filePath, lintResults, ruleConfig });
      } else if (path.extname(file) === '.json') {
         try {
            const data = await fs.readFile(filePath, 'utf8');
            const jsonData = JSON.parse(data);
            const linter = new XanoLinter({ rules: ruleConfig }, jsonData);
            const results = await linter.lint();
            if (results.length > 0) {
               lintResults.push({
                  name: jsonData.name,
                  filePath,
                  results,
               });
            }
         } catch (err) {
            log.error(`Error processing file ${filePath}: ${err}`);
         }
      }
   }
}

async function main({ inputDir, outputFile, ruleConfig }) {
   const s = spinner();
   s.start('Linting in progress...');
   try {
      const tempDir = path.dirname(outputFile);
      await fs.mkdir(tempDir, { recursive: true });
      const lintResults = [];
      await runLinterOnJsonFiles({
         dirPath: inputDir,
         lintResults,
         ruleConfig,
      });

      // Write linting results to file
      if (lintResults.length > 0) {
         await fs.writeFile(outputFile, JSON.stringify(lintResults, null, 2));
         s.stop(`Linting results written -> ${outputFile}`);
      } else {
         s.stop('No linting issues found.');
      }
   } catch (err) {
      s.stop('Linting resulted in error:');
      log.error(`Error during linting process: ${JSON.stringify(err)}`);
   }
}

export { main as runLintXano };
