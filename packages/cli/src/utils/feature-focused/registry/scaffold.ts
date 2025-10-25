import { dirname, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

async function ensureDirForFile(filePath: string) {
   const dir = dirname(filePath);
   await mkdir(dir, { recursive: true });
}

// [ ] CLI
async function scaffoldRegistry(
   { registryRoot }: { registryRoot?: string } = {
      registryRoot: 'registry',
   }
) {
   const componentsRoot = 'components';
   const definitionPath = join(registryRoot);
   const functionName = 'hello-world';
   const functionRelPath = `functions/${functionName}`;
   const functionFileName = `${functionName}.xs`;

   // Paths
   const functionFilePath = join(registryRoot, componentsRoot, 'functions', functionFileName);
   const functionDefPath = join(definitionPath, 'functions', `${functionName}.json`);
   const indexPath = join(definitionPath, 'index.json');
   const extensionLessFileName = functionFileName.endsWith('.xs')
      ? functionFileName.slice(0, -3)
      : functionFileName;

   // Sample content
   const sampleFunctionContent = `function "${extensionLessFileName}" {
    input {
      int score
    }
    stack {
      var $x1 {
        value = $input.score + 1
      }
    }
    response = $x1
  }`;

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
            target: `/caly/${functionName}`,
         },
      ],
   };

   const sampleIndex = {
      $schema: 'https://calycode.com/schemas/registry/registry.json',
      name: 'xano-registry',
      homepage: 'https://calycode.com',
      items: [sampleRegistryItem],
   };

   // Ensure directories and write files
   await ensureDirForFile(functionFilePath);
   await ensureDirForFile(functionDefPath);
   await ensureDirForFile(indexPath);

   await writeFile(functionFilePath, sampleFunctionContent, 'utf8');
   await writeFile(functionDefPath, JSON.stringify(sampleRegistryItem, null, 2), 'utf8');
   await writeFile(indexPath, JSON.stringify(sampleIndex, null, 2), 'utf8');
}

export { scaffoldRegistry };
