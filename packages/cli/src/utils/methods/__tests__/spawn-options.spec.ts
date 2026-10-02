import { getSpawnOptions } from '../spawn-options';

describe('getSpawnOptions', () => {
   it('defaults to inherit stdio without a shell', () => {
      const options = getSpawnOptions();

      expect(options.stdio).toBe('inherit');
      expect(options.shell).toBe(false);
   });

   it('defaults env to process.env', () => {
      expect(getSpawnOptions().env).toBe(process.env);
   });

   it('merges extra env over process.env and passes shell through', () => {
      const options = getSpawnOptions('pipe', true, { CALY_TEST: 'x' });

      expect(options.stdio).toBe('pipe');
      expect(options.shell).toBe(true);
      expect(options.env).not.toBe(process.env);
      expect(options.env.CALY_TEST).toBe('x');
   });
});
