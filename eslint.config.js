// I'm not fully sure if this is needed yet.
// [ ] TODO: check and remove in redundant.
import importPlugin from 'eslint-plugin-import';

export default [
   {
      plugins: {
         import: importPlugin,
      },
      rules: {
         'import/no-unresolved': 'error',
      },
   },
];
