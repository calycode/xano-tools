import { build } from 'esbuild';
import { cp, rm, mkdir, writeFile } from 'fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');

(async () => {
   try {
      // Clean and recreate the dist directory for a fresh build
      await rm(distDir, { recursive: true, force: true });
      await mkdir(distDir, { recursive: true });
      console.log('Cleaned and recreated dist directory.');

      // Copy runtime assets to the dist folder
      await cp(resolve(rootDir, 'util-resources'), resolve(distDir, 'util-resources'), {
         recursive: true,
      });
      console.log('Copied assets to dist.');

      // Bundle the application with esbuild
      const result = await build({
         entryPoints: [resolve(rootDir, 'src/index.js')],
         bundle: true,
         platform: 'node',
         target: 'node20',
         format: 'esm',
         outfile: resolve(distDir, 'index.js'),
         minify: true,
         // Mark heavy dependencies as external to reduce bundle size.
         // Node.js will resolve these from node_modules at runtime.
         // This is a standard practice for CLI tools.
         external: ['figlet', 'tar', 'axios', 'js-yaml'],
         sourcemap: true,
         metafile: true,
      });
      console.log('esbuild bundling complete.');

      // Write the metafile for analysis
      await writeFile(resolve(distDir, 'meta.json'), JSON.stringify(result.metafile, null, 2));
      console.log(
         'Build complete. You can analyze the bundle with https://esbuild.github.io/analyze/ by uploading dist/meta.json'
      );
   } catch (error) {
      console.error('Build failed:', error);
      process.exit(1);
   }
})();
