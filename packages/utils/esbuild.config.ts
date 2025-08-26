import { build } from 'esbuild';
import { baseConfig } from '../../esbuild.base'; // optional shared config

async function main() {
   await build({
      ...baseConfig,
      entryPoints: ['src/index.ts'],
      outdir: 'dist',
      format: 'esm',
      outExtension: { '.js': '.js' },
   });
   await build({
      ...baseConfig,
      entryPoints: ['src/index.ts'],
      outdir: 'dist',
      format: 'cjs',
      outExtension: { '.js': '.cjs' },
   });
}

main().catch((err) => {
   console.error(err);
   process.exit(1);
});
