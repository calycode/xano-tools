import { parsePortRequest, selectAvailablePort } from '../ports';

describe('parsePortRequest', () => {
   it('treats missing and auto values as "let the host choose"', () => {
      expect(parsePortRequest(undefined)).toBeNull();
      expect(parsePortRequest(null)).toBeNull();
      expect(parsePortRequest('')).toBeNull();
      expect(parsePortRequest('auto')).toBeNull();
      expect(parsePortRequest('AUTO')).toBeNull();
      expect(parsePortRequest(0)).toBeNull();
      expect(parsePortRequest('0')).toBeNull();
   });

   it('accepts numbers and numeric strings', () => {
      expect(parsePortRequest(4096)).toBe(4096);
      expect(parsePortRequest('4096')).toBe(4096);
      expect(parsePortRequest(' 4096 ')).toBe(4096);
   });

   it('rejects invalid or out-of-range values', () => {
      expect(() => parsePortRequest('abc')).toThrow('Invalid port number');
      expect(() => parsePortRequest('4096abc')).toThrow('Invalid port number');
      expect(() => parsePortRequest(65536)).toThrow('Invalid port number');
      expect(() => parsePortRequest(-1)).toThrow('Invalid port number');
      expect(() => parsePortRequest(4096.5)).toThrow('Invalid port number');
      expect(() => parsePortRequest(true)).toThrow('Invalid port number');
   });
});

describe('selectAvailablePort', () => {
   const scan = { scanStart: 4096, scanEnd: 4098 };

   it('uses the requested port when it is free', async () => {
      const selection = await selectAvailablePort(4096, {
         ...scan,
         isAvailable: async () => true,
         getEphemeralPort: async () => 50000,
      });

      expect(selection).toEqual({
         port: 4096,
         requestedPort: 4096,
         autoSelected: false,
         source: 'requested',
      });
   });

   it('scans the configured range when the requested port is busy', async () => {
      const busy = new Set([4096, 4097]);
      const selection = await selectAvailablePort(4096, {
         ...scan,
         isAvailable: async (port) => !busy.has(port),
         getEphemeralPort: async () => 50000,
      });

      expect(selection).toEqual({
         port: 4098,
         requestedPort: 4096,
         autoSelected: true,
         source: 'scan',
      });
   });

   it('starts scanning from the default port when no port is requested', async () => {
      const selection = await selectAvailablePort(null, {
         ...scan,
         isAvailable: async (port) => port === 4097,
         getEphemeralPort: async () => 50000,
      });

      expect(selection).toEqual({
         port: 4097,
         requestedPort: null,
         autoSelected: true,
         source: 'scan',
      });
   });

   it('falls back to an OS-assigned ephemeral port when the scan range is busy', async () => {
      const selection = await selectAvailablePort(4096, {
         ...scan,
         isAvailable: async (port) => port === 50000,
         getEphemeralPort: async () => 50000,
      });

      expect(selection).toEqual({
         port: 50000,
         requestedPort: 4096,
         autoSelected: true,
         source: 'ephemeral',
      });
   });

   it('skips ports that a previous attempt already failed on', async () => {
      const selection = await selectAvailablePort(4096, {
         ...scan,
         exclude: [4096, 4097],
         isAvailable: async () => true,
         getEphemeralPort: async () => 50000,
      });

      expect(selection.port).toBe(4098);
   });

   it('throws when neither the range nor an ephemeral port is available', async () => {
      await expect(
         selectAvailablePort(4096, {
            ...scan,
            isAvailable: async () => false,
            getEphemeralPort: async () => 50000,
         }),
      ).rejects.toThrow('No available port found');
   });
});
