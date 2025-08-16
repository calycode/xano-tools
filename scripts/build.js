import { build } from 'esbuild';
import { replace } from 'esbuild-plugin-replace';
import { cp, rm, mkdir, writeFile } from 'fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { intro, outro, log } from '@clack/prompts';
import { minifyJsonInDir } from './minify-json-in-dir.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');

(async () => {
   try {
      intro('Bundling XCC with esbuild');
      // Clean and recreate the dist directory for a fresh build
      await rm(distDir, { recursive: true, force: true });
      await mkdir(distDir, { recursive: true });
      log.step('Cleaned and recreated dist directory.');

      // Copy util-resources (xano-grammar)
      await cp(resolve(rootDir, 'util-resources'), resolve(distDir, 'util-resources'), {
         recursive: true,
      });
      // Copy github actions
      await cp(resolve(rootDir, 'src/actions'), resolve(distDir, 'actions'), {
         recursive: true,
      });
      await minifyJsonInDir(resolve(distDir, 'util-resources'));
      log.step('Copied and minified assets to dist.');

      // Bundle the application with esbuild
      const result = await build({
         entryPoints: [resolve(rootDir, 'src/index.js')],
         bundle: true,
         platform: 'node',
         plugins: [
            replace({
               // Replace the whole expression everywhere!
               'fileURLToPath(import.meta.url)': '__filename',
            }),
         ],
         target: 'node20',
         format: 'cjs',
         outfile: resolve(distDir, 'index.cjs'),
         minify: true,
         // Mark heavy dependencies as external to reduce bundle size.
         // Node.js will resolve these from node_modules at runtime.
         // This is a standard practice for CLI tools.
         external: ['figlet', 'tar', 'axios', 'js-yaml'],
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
      log.error('Build failed:', error);
      process.exit(1);
   }
})();
