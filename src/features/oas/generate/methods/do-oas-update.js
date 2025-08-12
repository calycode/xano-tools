import fs from 'fs/promises';
import path from 'path';
import { patchOasSpec } from './index.js';

export default async function doOasUpdate(inputOas, outputDir) {
   // Load and patch
   const originalOas = inputOas;
   const oas = await patchOasSpec(originalOas);

   // Ensure output directories exist
   await fs.mkdir(outputDir, { recursive: true });
   await fs.mkdir(path.join(outputDir, 'html'), { recursive: true });

   // Write JSON specs
   await fs.writeFile(path.join(outputDir, 'spec.json'), JSON.stringify(oas, null, 2));
   await fs.writeFile(path.join(outputDir, 'html', 'spec.json'), JSON.stringify(oas, null, 2));

   // Write Scalar HTML
   const html = `
<!doctype html>
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

   return oas;
}
