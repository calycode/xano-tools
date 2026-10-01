import { compareManagedVersionsDesc, parseManagedVersion } from '../install';

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
