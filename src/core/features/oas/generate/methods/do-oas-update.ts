import { joinPath } from '../../../../utils';
import { patchOasSpec } from './index';

// [ ] CORE
export default async function doOasUpdate({
   inputOas,
   outputDir,
   instanceConfig,
   workspaceConfig,
   storage,
}) {
   // Load and patch
   const oas = await patchOasSpec({ oas: inputOas, instanceConfig, workspaceConfig, storage });

   // Ensure output directories exist
   await storage.mkdir(outputDir, { recursive: true });
   await storage.mkdir(joinPath(outputDir, 'html'), { recursive: true });

   // Write JSON specs
   await storage.writeFile(joinPath(outputDir, 'spec.json'), JSON.stringify(oas, null, 2));
   await storage.writeFile(joinPath(outputDir, 'html', 'spec.json'), JSON.stringify(oas, null, 2));

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
   await storage.writeFile(joinPath(outputDir, 'html', 'index.html'), html);

   return oas;
}
