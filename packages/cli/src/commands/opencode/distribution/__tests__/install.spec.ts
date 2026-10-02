import { compareManagedVersionsDesc, parseManagedVersion, selectGlobalOpencodeBinary } from '../install';

describe('parseManagedVersion', () => {
   it('parses a plain semantic version', () => {
      expect(parseManagedVersion('1.2.3')).toEqual({
         major: 1,
         minor: 2,
         patch: 3,
         prerelease: undefined,
      });
   });

   it('captures a prerelease tag', () => {
      expect(parseManagedVersion('1.2.3-beta.1')).toEqual({
         major: 1,
         minor: 2,
         patch: 3,
         prerelease: 'beta.1',
      });
   });

   it('returns null for a non-semver directory name', () => {
      expect(parseManagedVersion('latest')).toBeNull();
   });
});

describe('compareManagedVersionsDesc', () => {
   it('sorts newest first regardless of numeric width', () => {
      const versions = ['1.2.3', '2.0.0', '1.10.0'];
      expect(versions.sort(compareManagedVersionsDesc)).toEqual(['2.0.0', '1.10.0', '1.2.3']);
   });

   it('ranks a stable release above its prerelease', () => {
      expect(compareManagedVersionsDesc('1.0.0', '1.0.0-beta.1')).toBeLessThan(0);
   });
});

describe('selectGlobalOpencodeBinary', () => {
   it('prefers an .exe over .cmd, .bat, and extensionless shims on Windows', () => {
      const candidates = [
         'C:\\pnpm\\bin\\opencode',
         'C:\\pnpm\\bin\\opencode.cmd',
         'C:\\pnpm\\bin\\opencode.exe',
      ];

      expect(selectGlobalOpencodeBinary(candidates, 'win32')).toBe('C:\\pnpm\\bin\\opencode.exe');
   });

   it('accepts a .cmd shim when no .exe exists', () => {
      const candidates = ['C:\\pnpm\\bin\\opencode', 'C:\\pnpm\\bin\\opencode.cmd'];

      expect(selectGlobalOpencodeBinary(candidates, 'win32')).toBe('C:\\pnpm\\bin\\opencode.cmd');
   });

   it('rejects extensionless shims on Windows', () => {
      expect(selectGlobalOpencodeBinary(['C:\\pnpm\\bin\\opencode'], 'win32')).toBeUndefined();
   });

   it('returns the first candidate on non-Windows platforms', () => {
      expect(
         selectGlobalOpencodeBinary(['/usr/local/bin/opencode', '/usr/bin/opencode'], 'darwin'),
      ).toBe('/usr/local/bin/opencode');
   });
});
