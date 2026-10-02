import { requiresShell } from '../spawn-plan';

describe('requiresShell', () => {
   it('requires a shell for .cmd and .bat shims on Windows', () => {
      expect(requiresShell('C:\\pnpm\\bin\\opencode.cmd', 'win32')).toBe(true);
      expect(requiresShell('C:\\pnpm\\bin\\opencode.BAT', 'win32')).toBe(true);
   });

   it('does not require a shell for executables on Windows', () => {
      expect(requiresShell('C:\\pnpm\\bin\\opencode.exe', 'win32')).toBe(false);
      expect(requiresShell('C:\\pnpm\\bin\\opencode', 'win32')).toBe(false);
   });

   it('never requires a shell off Windows', () => {
      expect(requiresShell('/usr/local/bin/opencode', 'darwin')).toBe(false);
      expect(requiresShell('/usr/local/bin/opencode.cmd', 'darwin')).toBe(false);
   });
});
