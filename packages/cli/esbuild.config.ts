import { cp, writeFile } from 'fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { intro, outro, log } from '@clack/prompts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname);
const distDir = resolve(__dirname, 'dist');

(async () => {
   try {
      intro('Bundling Caly with esbuild');

      // Copy github actions
      await cp(resolve(rootDir, 'src/actions'), resolve(distDir, 'actions'), {
         recursive: true,
      });
      log.step('Copied and minified assets to dist.');

      // Bundle the application with esbuild
      const result = await build({
         entryPoints: [resolve(rootDir, 'src/index.ts')],
         bundle: true,
         platform: 'node',
         plugins: [],
         target: 'node20',
         format: 'cjs',
         outfile: resolve(distDir, 'index.cjs'),
         treeShaking: true,
         minify: true,
         banner: {
            js: '#!/usr/bin/env node',
         },
         sourcemap: true,
         metafile: true,
      });
      log.step('esbuild bundling complete.');

      // Write the metafile for analysis
      await writeFile(resolve(distDir, 'meta.json'), JSON.stringify(result.metafile, null, 2));

      outro(
         'Build complete. You can analyze the bundle with https://esbuild.github.io/analyze/ by uploading dist/meta.json'
      );
   } catch (error) {
      log.error(`Build failed: ${JSON.stringify(error, null, 2)}`);
      process.exit(1);
   }
})();
