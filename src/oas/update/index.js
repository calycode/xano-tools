import fs from 'fs/promises';
import path from 'path';

// Pure function: patch OAS object in-memory
export function patchOasSpec(oas) {
   const newOas = { ...oas };
   newOas.openapi = '3.1.1';
   newOas.components = newOas.components || {};
   newOas.components.securitySchemes = newOas.components.securitySchemes || {};
   newOas.components.securitySchemes.bearerAuth = {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
   };
   newOas.security = newOas.security || [{ bearerAuth: [] }];
   return newOas;
}

// I/O: load, patch, save, and generate Scalar HTML
export async function updateOpenapiSpec(inputOas, outputDir) {
   // Load and patch
   const oasRaw = await fs.readFile(inputOas, 'utf8');
   const originalOas = JSON.parse(oasRaw);
   const oas = patchOasSpec(originalOas);

   // Ensure output directories exist
   await fs.mkdir(outputDir, { recursive: true });
   await fs.mkdir(path.join(outputDir, 'html'), { recursive: true });

   // Write JSON specs
   await fs.writeFile(path.join(outputDir, 'spec.json'), JSON.stringify(oas, null, 2));
   await fs.writeFile(path.join(outputDir, 'html', 'spec.json'), JSON.stringify(oas, null, 2));

   // Write Scalar HTML
   const html = `<!doctype html>
<html>
  <head>
    <title>${oas.info?.title || 'API Reference'}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script>
      Scalar.createApiReference('#app', {
        url: './spec.json',
        hideModels: false,
        hideDownloadButton: false,
        hideTestRequestButton: false,
        hideSearch: false,
        darkMode: false,
        searchHotKey: "k",
        favicon: "",
        defaultHttpClient: { 
          targetKey: "node", 
          clientKey: "fetch"
        },
        authentication: {
          preferredSecurityScheme: "bearerAuth"
        },
        defaultOpenAllTags: false,
        hideClientButton: false,
        tagsSorter: "alpha",
        operationsSorter: "method",
        theme: "deepSpace"
      })
    </script>
  </body>
</html>
`;
   await fs.writeFile(path.join(outputDir, 'html', 'index.html'), html);

   return oas; // Return the updated OAS object for further use (e.g., SDK generation)
}
