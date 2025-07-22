import fs from 'fs/promises';
import path from 'path';

export async function updateOpenapiSpec(inputOas, outputDir) {
   // 1. Load the OAS file
   const oasRaw = await fs.readFile(inputOas, 'utf8');
   const oas = JSON.parse(oasRaw);

   // 2. Patch the OAS object
   oas.openapi = '3.1.1';
   oas.components = oas.components || {};
   oas.components.securitySchemes = oas.components.securitySchemes || {};
   oas.components.securitySchemes.bearerAuth = {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
   };
   oas.security = oas.security || [{ bearerAuth: [] }];

   // 3. Ensure output directories exist
   await fs.mkdir(outputDir, { recursive: true });
   await fs.mkdir(path.join(outputDir, 'html'), { recursive: true });

   // 4. Write the updated OAS to both locations
   await fs.writeFile(path.join(outputDir, 'spec.json'), JSON.stringify(oas, null, 2));
   await fs.writeFile(path.join(outputDir, 'html', 'spec.json'), JSON.stringify(oas, null, 2));

   // 5. Write the Scalar HTML, referencing the correct spec file
   const html = `<!doctype html>
<html>
  <head>
    <title>${oas.info.title}</title>
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
}
