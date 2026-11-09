import os from 'node:os';
import { execSync } from 'node:child_process';
import { isLikelyOpenCodeServerOnPort, killProcessOnPort } from '../runtime';

jest.mock('node:child_process', () => ({
   execSync: jest.fn(),
   spawn: jest.fn(),
}));

const execSyncMock = execSync as jest.MockedFunction<typeof execSync>;
const EXTENSION_ORIGIN = 'chrome-extension://hadkkdmpcmllbkfopioopcmeapjchpbm';

function mockWindowsCommands(handlers: {
   netstat?: string;
   processList?: string;
   processById?: (command: string) => string;
}) {
   execSyncMock.mockImplementation(((command: string) => {
      if (command.includes('netstat -ano')) {
         return handlers.netstat ?? '';
      }

      if (command.includes('ConvertTo-Json')) {
         return handlers.processList ?? '';
      }

      if (command.includes('Get-CimInstance Win32_Process -Filter')) {
         return handlers.processById?.(command) ?? '';
      }

      return '';
   }) as typeof execSync);
}

describe('isLikelyOpenCodeServerOnPort', () => {
   const originalFetch = global.fetch;

   afterEach(() => {
      global.fetch = originalFetch;
   });

   function mockHealth(handlers: Record<string, string | null>) {
      global.fetch = jest.fn(async (input: RequestInfo | URL) => {
         const url = String(input);
         const path = Object.keys(handlers).find((candidate) => url.endsWith(candidate));
         const version = path ? handlers[path] : null;

         if (!version) {
            return { ok: false, json: async () => ({}) } as unknown as Response;
         }

         return {
            ok: true,
            json: async () => ({ version }),
         } as unknown as Response;
      }) as typeof fetch;
   }

   it('uses the V2 /api/info endpoint for OpenCode 2.x', async () => {
      const calls: string[] = [];
      global.fetch = jest.fn(async (input: RequestInfo | URL) => {
         const url = String(input);
         calls.push(url);
         if (url.endsWith('/api/info')) {
            return { ok: true, json: async () => ({ version: '2.2.6' }) } as unknown as Response;
         }
         return { ok: false, json: async () => ({}) } as unknown as Response;
      }) as typeof fetch;

      await expect(isLikelyOpenCodeServerOnPort(4096, '2.2.6')).resolves.toBe(true);
      expect(calls[0]).toContain('/api/info');
   });

   it('uses /global/health for OpenCode 1.x', async () => {
      mockHealth({
         '/global/health': '1.19.5',
      });

      await expect(isLikelyOpenCodeServerOnPort(4096, '1.19.5')).resolves.toBe(true);
   });

   it('rejects a V1 server when V2 is expected', async () => {
      mockHealth({
         '/global/health': '1.19.5',
      });

      await expect(isLikelyOpenCodeServerOnPort(4096, '2.2.6')).resolves.toBe(false);
   });

   it('authenticates /api/info with the configured password', async () => {
      const calls: Array<{ url: string; headers?: unknown }> = [];
      global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
         calls.push({ url: String(input), headers: init?.headers });
         return {
            ok: true,
            status: 200,
            json: async () => ({ version: '2.2.6' }),
         } as unknown as Response;
      }) as typeof fetch;

      await expect(
         isLikelyOpenCodeServerOnPort(4096, '2.2.6', undefined, 'secret'),
      ).resolves.toBe(true);

      expect(calls[0].url).toContain('/api/info');
      expect(calls[0].headers).toEqual({
         Authorization: `Basic ${Buffer.from('opencode:secret').toString('base64')}`,
      });
   });

   it('treats an auth-protected /api/info as ready when no password is available', async () => {
      global.fetch = jest.fn(async () => ({
         ok: false,
         status: 401,
         json: async () => ({ _tag: 'UnauthorizedError' }),
      })) as unknown as typeof fetch;

      await expect(isLikelyOpenCodeServerOnPort(4096, '2.2.6')).resolves.toBe(true);
   });
});

describe('killProcessOnPort', () => {
   beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(os, 'platform').mockReturnValue('win32');
   });

   afterEach(() => {
      jest.restoreAllMocks();
   });

   it('finds the server by command line when netstat omits the listening row', () => {
      mockWindowsCommands({
         netstat: '  TCP    127.0.0.1:40960       0.0.0.0:0              LISTENING       1111\r\n',
         processList: JSON.stringify([
            {
               ProcessId: 4321,
               CommandLine: `opencode.exe serve --port 4096 --cors ${EXTENSION_ORIGIN}`,
            },
         ]),
      });

      const killed = killProcessOnPort(4096, new Set(), undefined, {
         allowUnmanagedOpencode: true,
         managedMarkers: [EXTENSION_ORIGIN],
      });

      expect(killed).toBe(true);
      expect(execSyncMock).toHaveBeenCalledWith(
         'taskkill /F /PID 4321',
         expect.objectContaining({ windowsHide: true }),
      );
   });

   it('uses server-side netstat rows and matches the exact port', () => {
      mockWindowsCommands({
         netstat:
            '  TCP    127.0.0.1:4096        127.0.0.1:55000        ESTABLISHED     4321\r\n' +
            '  TCP    127.0.0.1:55000       127.0.0.1:4096         ESTABLISHED     9999\r\n' +
            '  TCP    127.0.0.1:40960       0.0.0.0:0              LISTENING       1111\r\n',
         processList: '',
         processById: (command) =>
            command.includes('ProcessId = 4321')
               ? `opencode.exe serve --port 4096 --cors ${EXTENSION_ORIGIN}`
               : '',
      });

      const killed = killProcessOnPort(4096, new Set(), undefined, {
         allowUnmanagedOpencode: true,
         managedMarkers: [EXTENSION_ORIGIN],
      });

      expect(killed).toBe(true);
      expect(execSyncMock).toHaveBeenCalledWith(
         'taskkill /F /PID 4321',
         expect.objectContaining({ windowsHide: true }),
      );
      expect(execSyncMock).not.toHaveBeenCalledWith(
         'taskkill /F /PID 9999',
         expect.anything(),
      );
      expect(execSyncMock).not.toHaveBeenCalledWith(
         'taskkill /F /PID 1111',
         expect.anything(),
      );
   });

   it('queries PowerShell with a single-quoted process filter', () => {
      mockWindowsCommands({
         netstat: '  TCP    127.0.0.1:4096        0.0.0.0:0              LISTENING       4321\r\n',
         processList: '',
         processById: () => `opencode.exe serve --port 4096 --cors ${EXTENSION_ORIGIN}`,
      });

      killProcessOnPort(4096, new Set(), undefined, {
         allowUnmanagedOpencode: true,
         managedMarkers: [EXTENSION_ORIGIN],
      });

      const commands = execSyncMock.mock.calls.map(([command]) => String(command));
      expect(
         commands.some((command) => command.includes("-Filter 'ProcessId = 4321'")),
      ).toBe(true);
   });

   it('refuses to kill an OpenCode process without this installation marker', () => {
      mockWindowsCommands({
         netstat: '',
         processList: JSON.stringify([
            {
               ProcessId: 4321,
               CommandLine: 'opencode.exe serve --port 4096',
            },
         ]),
      });

      const killed = killProcessOnPort(4096, new Set(), undefined, {
         allowUnmanagedOpencode: true,
         managedMarkers: [EXTENSION_ORIGIN],
      });

      expect(killed).toBe(false);
      expect(execSyncMock).not.toHaveBeenCalledWith(
         'taskkill /F /PID 4321',
         expect.anything(),
      );
   });
});
