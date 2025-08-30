import { joinPath } from '@calycode/utils';
import { patchOasSpec } from './index';

interface GeneratedItem {
   path: string;
   content: string;
}

interface DoOasUpdateOutput {
   oas: any;
   generatedItems: GeneratedItem[];
}

export default async function doOasUpdate({
   inputOas,
   instanceConfig,
   workspaceConfig,
   storage, // Used for meta lookups, not FS
}: {
   inputOas: any;
   instanceConfig: any;
   workspaceConfig: any;
   storage: any;
}): Promise<DoOasUpdateOutput> {
   // Patch and enrich OAS
   const oas = await patchOasSpec({ oas: inputOas, instanceConfig, workspaceConfig, storage });

   // Prepare output artifacts (relative paths)
   const generatedItems: GeneratedItem[] = [
      {
         path: 'spec.json',
         content: JSON.stringify(oas, null, 2),
      },
      {
         path: joinPath('html', 'spec.json'),
         content: JSON.stringify(oas, null, 2),
      },
      {
         path: joinPath('html', 'index.html'),
         content: `
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
`.trim(),
      },
   ];

   return { oas, generatedItems };
}
