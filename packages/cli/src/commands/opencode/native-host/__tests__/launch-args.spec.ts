import { detectNativeHostLaunch, isNativeHostLaunchArgs } from '../launch-args';

describe('isNativeHostLaunchArgs', () => {
   it('accepts an empty argument list', () => {
      expect(isNativeHostLaunchArgs([])).toBe(true);
   });

   it('accepts --oc-version with a value', () => {
      expect(isNativeHostLaunchArgs(['--oc-version', '0.9.4'])).toBe(true);
   });

   it('accepts --oc-version=<value>', () => {
      expect(isNativeHostLaunchArgs(['--oc-version=0.9.4'])).toBe(true);
   });

   it('rejects --oc-version with a missing value', () => {
      expect(isNativeHostLaunchArgs(['--oc-version'])).toBe(false);
   });

   it('rejects extra arguments', () => {
      expect(isNativeHostLaunchArgs(['--verbose'])).toBe(false);
      expect(isNativeHostLaunchArgs(['--oc-version', '0.9.4', '--verbose'])).toBe(false);
   });
});

describe('detectNativeHostLaunch', () => {
   it('returns false when argv has no arguments', () => {
      expect(detectNativeHostLaunch(['caly-xano'])).toEqual({
         isNativeHost: false,
         extraArgs: [],
      });
   });

   it('returns false for a regular command', () => {
      expect(detectNativeHostLaunch(['caly-xano', 'setup-instance'])).toEqual({
         isNativeHost: false,
         extraArgs: [],
      });
   });

   it('detects opencode native-host', () => {
      expect(detectNativeHostLaunch(['caly-xano', 'opencode', 'native-host'])).toEqual({
         isNativeHost: true,
         extraArgs: [],
      });
   });

   it('detects the oc alias', () => {
      expect(detectNativeHostLaunch(['caly-xano', 'oc', 'native-host'])).toEqual({
         isNativeHost: true,
         extraArgs: [],
      });
   });

   it('detects --oc-version with a separate value', () => {
      expect(
         detectNativeHostLaunch(['caly-xano', 'opencode', 'native-host', '--oc-version', '0.9.4']),
      ).toEqual({ isNativeHost: true, extraArgs: ['--oc-version', '0.9.4'] });
   });

   it('detects --oc-version=<value>', () => {
      expect(
         detectNativeHostLaunch(['caly-xano', 'opencode', 'native-host', '--oc-version=0.9.4']),
      ).toEqual({ isNativeHost: true, extraArgs: ['--oc-version=0.9.4'] });
   });

   it('returns false for unsupported extra arguments', () => {
      expect(
         detectNativeHostLaunch(['caly-xano', 'opencode', 'native-host', '--verbose']),
      ).toEqual({ isNativeHost: false, extraArgs: ['--verbose'] });
   });

   it('detects a chrome-extension origin anywhere in argv', () => {
      expect(
         detectNativeHostLaunch([
            'caly-xano',
            'opencode',
            'native-host',
            'chrome-extension://hadkkdmpcmllbkfopioopcmeapjchpbm',
         ]),
      ).toEqual({
         isNativeHost: true,
         extraArgs: ['chrome-extension://hadkkdmpcmllbkfopioopcmeapjchpbm'],
      });
   });

   it('detects a bare chrome-extension launch', () => {
      expect(
         detectNativeHostLaunch(['caly-xano', 'chrome-extension://hadkkdmpcmllbkfopioopcmeapjchpbm']),
      ).toEqual({
         isNativeHost: true,
         extraArgs: [],
      });
   });

   it('ignores native-host mentioned without the command position', () => {
      expect(detectNativeHostLaunch(['caly-xano', 'serve', 'native-host'])).toEqual({
         isNativeHost: false,
         extraArgs: [],
      });
   });
});
