import dts from 'rollup-plugin-dts';

export default [
  {
    input: 'packages/types/dist/index.d.ts',
    output: { file: 'packages/types/dist/index.bundled.d.ts', format: 'es' },
    plugins: [dts()],
  },
  {
    input: 'packages/utils/dist/index.d.ts', 
    output: { file: 'packages/utils/dist/index.bundled.d.ts', format: 'es' },
    plugins: [dts()],
  },
  {
    input: 'packages/core/dist/index.d.ts',
    output: { file: 'packages/core/dist/index.bundled.d.ts', format: 'es' },
    plugins: [dts()],
  }
];
