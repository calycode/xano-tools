import { joinPath, dirname } from '../src';

describe('joinPath', () => {
   it('joins simple segments', () => {
      expect(joinPath('a', 'b', 'c')).toBe('a/b/c');
   });

   it('removes leading/trailing slashes appropriately', () => {
      expect(joinPath('/a/', '/b/', '/c/')).toBe('a/b/c');
      expect(joinPath('/a', 'b/', '/c/')).toBe('a/b/c');
      expect(joinPath('///a///', '///b///', '///c///')).toBe('a/b/c');
   });

   it('filters out empty segments', () => {
      expect(joinPath('a', '', 'b')).toBe('a/b');
      expect(joinPath('', '', 'a')).toBe('a');
      expect(joinPath('', '', '')).toBe('');
   });

   it('handles single and no segments', () => {
      expect(joinPath('a')).toBe('a');
      expect(joinPath()).toBe('');
   });
});

describe('dirname', () => {
   it('returns parent directory for a typical path', () => {
      expect(dirname('a/b/c')).toBe('a/b');
      expect(dirname('a/b/c/')).toBe('a/b');
   });

   it('returns . for no slash', () => {
      expect(dirname('abc')).toBe('.');
   });

   it('returns / for root-level file', () => {
      expect(dirname('/foo')).toBe('/');
      expect(dirname('/foo/')).toBe('/');
   });

   it('returns / for root', () => {
      expect(dirname('/')).toBe('.');
      expect(dirname('///')).toBe('.');
   });

   it('handles empty string', () => {
      expect(dirname('')).toBe('.');
   });
});
