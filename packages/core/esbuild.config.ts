import { writeFile } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { build } from 'esbuild';
import { baseConfig } from '../../esbuild.base'; // optional shared config

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, 'dist');

async function main() {
   const esmResult = await build({
      ...baseConfig,
      entryPoints: ['src/index.ts'],
      outdir: 'dist',
      format: 'esm',
      outExtension: { '.js': '.js' },
      sourcemap: false,
      metafile: true,
   });
   const cjsResult = await build({
      ...baseConfig,
      entryPoints: ['src/index.ts'],
      outdir: 'dist',
      format: 'cjs',
      outExtension: { '.js': '.cjs' },
      sourcemap: false,
      metafile: true,
   });

   await writeFile(resolve(distDir, 'esm-meta.json'), JSON.stringify(esmResult.metafile, null, 2));
   await writeFile(resolve(distDir, 'cjs-meta.json'), JSON.stringify(cjsResult.metafile, null, 2));
}

main().catch((err) => {
   console.error(err);
   process.exit(1);
});
