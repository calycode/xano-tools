import { cp, writeFile } from 'fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname);
const distDir = resolve(__dirname, 'dist');

function defineEnvValue(name: string): string {
   const value = process.env[name];
   return value === undefined ? JSON.stringify('') : JSON.stringify(value);
}

const buildEnvDefines: Record<string, string> = {
   'process.env.CALY_BUILD_OC_EXT_DISCOVERY_MODE': defineEnvValue('CALY_BUILD_OC_EXT_DISCOVERY_MODE'),
   'process.env.CALY_BUILD_OC_EXT_NAME': defineEnvValue('CALY_BUILD_OC_EXT_NAME'),
   'process.env.CALY_BUILD_OC_EXT_TRUSTED_AUTHORS': defineEnvValue('CALY_BUILD_OC_EXT_TRUSTED_AUTHORS'),
   'process.env.CALY_BUILD_OC_EXT_TRUSTED_HOMEPAGES': defineEnvValue('CALY_BUILD_OC_EXT_TRUSTED_HOMEPAGES'),
   'process.env.CALY_BUILD_OC_EXT_TRUSTED_UPDATE_URLS': defineEnvValue('CALY_BUILD_OC_EXT_TRUSTED_UPDATE_URLS'),
   'process.env.CALY_BUILD_OC_EXT_REQUIRE_NATIVE_MESSAGING': defineEnvValue('CALY_BUILD_OC_EXT_REQUIRE_NATIVE_MESSAGING'),
   'process.env.CALY_BUILD_OC_EXT_PUBLIC_KEY_B64': defineEnvValue('CALY_BUILD_OC_EXT_PUBLIC_KEY_B64'),
   'process.env.CALY_BUILD_OC_EXT_DISCOVERY_ENABLED': defineEnvValue('CALY_BUILD_OC_EXT_DISCOVERY_ENABLED'),
   'process.env.CALY_BUILD_OC_EXT_INCLUDE_KNOWN_IDS': defineEnvValue('CALY_BUILD_OC_EXT_INCLUDE_KNOWN_IDS'),
   'process.env.CALY_BUILD_OC_WRITE_ALL_BROWSER_MANIFESTS': defineEnvValue('CALY_BUILD_OC_WRITE_ALL_BROWSER_MANIFESTS'),
};

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
         define: buildEnvDefines,
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
