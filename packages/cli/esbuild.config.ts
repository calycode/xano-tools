import { cp, writeFile } from 'fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname);
const distDir = resolve(__dirname, 'dist');

(async () => {
   try {
      // Copy github actions
      await cp(resolve(rootDir, 'src/actions'), resolve(distDir, 'actions'), {
         recursive: true,
      });

      // Bundle the application with esbuild
      const result = await build({
         entryPoints: {
            index: resolve(rootDir, 'src/index.ts'),
            'legacy-xano': resolve(rootDir, 'src/legacy-xano-command.ts'),
         },
         bundle: true,
         platform: 'node',
         plugins: [],
         target: 'node20',
         format: 'cjs',
         outdir: distDir,
         outExtension: {
            '.js': '.cjs',
         },
         treeShaking: true,
         minify: true,
         keepNames: false,
         banner: {
            js: '#!/usr/bin/env node',
         },
         sourcemap: false,
         metafile: true,
      });

      // Write the metafile for analysis
      await writeFile(resolve(distDir, 'meta.json'), JSON.stringify(result.metafile, null, 2));

      console.log(
         'Build complete. You can analyze the bundle with https://esbuild.github.io/analyze/ by uploading dist/meta.json',
      );
   } catch (error) {
      console.error(`Build failed: ${JSON.stringify(error, null, 2)}`);
      process.exit(1);
   }
})();
