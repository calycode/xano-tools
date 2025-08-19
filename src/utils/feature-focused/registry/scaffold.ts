import fs from 'fs/promises';
import path from 'path';
import { loadAndValidateContext } from '../../index';

async function ensureDirForFile(filePath) {
   const dir = path.dirname(filePath);
   await fs.mkdir(dir, { recursive: true });
}

async function scaffoldRegistry(
   { outputPath, instance } = { outputPath: 'registry', instance: null }
) {
   const { instanceConfig } = loadAndValidateContext({ instance });
   const registryRoot =
      outputPath ||
      (instanceConfig && instanceConfig.registry && instanceConfig.registry.output) ||
      'registry';

   const componentsRoot = 'components';
   const definitionPath = path.join(registryRoot, 'definitions');
   const functionName = 'hello-world';
   const functionRelPath = `functions/${functionName}`;
   const functionFileName = `${functionName}.xano`;

   // Paths
   const functionFilePath = path.join(registryRoot, componentsRoot, 'functions', functionFileName);
   const functionDefPath = path.join(definitionPath, 'functions', `${functionName}.json`);
   const indexPath = path.join(definitionPath, 'index.json');

   // Sample content
   const sampleFunctionContent = `
   function ${functionFileName} {
    input {
      int score
    }
    stack {
      var $x1 {
        value = $input.score + 1
      }
    }
    response {
      value = $x1
    }
  }
`;

   // Descriptor
   const sampleRegistryItem = {
      name: functionRelPath,
      type: 'registry:function',
      title: 'Hello world example function',
      description: 'A simple hello world function.',
      files: [
         {
            path: `${componentsRoot}/functions/${functionFileName}`,
            type: 'registry:function',
            target: `/xcc/${functionName}`,
         },
      ],
   };

   const sampleIndex = {
      $schema: 'https://nextcurve.hu/schemas/registry/registry.json',
      name: 'xano-community-registry',
      homepage: 'https://nextcurve.hu',
      items: [sampleRegistryItem],
   };

   // Ensure directories and write files
   await ensureDirForFile(functionFilePath);
   await ensureDirForFile(functionDefPath);
   await ensureDirForFile(indexPath);

   await fs.writeFile(functionFilePath, sampleFunctionContent, 'utf8');
   await fs.writeFile(functionDefPath, JSON.stringify(sampleRegistryItem, null, 2), 'utf8');
   await fs.writeFile(indexPath, JSON.stringify(sampleIndex, null, 2), 'utf8');

   console.log(`✅ Registry scaffolded at "${registryRoot}" with a sample component!`);
}

export { scaffoldRegistry };
