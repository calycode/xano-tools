// esbuild.base.ts
import type { BuildOptions } from 'esbuild';

export const baseConfig: BuildOptions = {
   bundle: true, // Always bundle
   sourcemap: true, // Useful for debugging
   logLevel: 'info', // Show logs
   target: 'node18', // Good default for most Node CLI tools
   treeShaking: true,
   minify: true, // Minify output for smaller bundles
   metafile: true, // For bundle analysis
};
