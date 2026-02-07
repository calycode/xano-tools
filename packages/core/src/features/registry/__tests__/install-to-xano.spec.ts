import { installRegistryItemToXano } from '../install-to-xano';

// Mock fetch globally
global.fetch = jest.fn();

// Mock Caly core instance
function createMockCore(token = 'test-token') {
   return {
      loadToken: jest.fn().mockResolvedValue(token),
   } as any;
}

const mockContext = {
   instanceConfig: { name: 'test-instance', url: 'https://x123.xano.io' },
   workspaceConfig: { id: 123, name: 'main' },
   branchConfig: { label: 'master' },
} as any;

describe('installRegistryItemToXano', () => {
   beforeEach(() => {
      jest.clearAllMocks();
   });

   it('should install inline content successfully', async () => {
      const mockResponse = { id: 1, name: 'test-func' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
         ok: true,
         json: () => Promise.resolve(mockResponse),
      });

      const item = {
         name: 'test-func',
         type: 'registry:function',
         content: 'function test() {}',
         files: [],
      };

      const results = await installRegistryItemToXano(
         item,
         mockContext,
         'https://registry.example.com',
         createMockCore(),
      );

      expect(results.installed).toHaveLength(1);
      expect(results.installed[0].file).toBe('test-func');
      expect(results.installed[0].response).toEqual(mockResponse);
      expect(results.failed).toHaveLength(0);
      expect(results.skipped).toHaveLength(0);
   });

   it('should install path-based file content by fetching from registry', async () => {
      // First fetch: get file content from registry
      (global.fetch as jest.Mock).mockResolvedValueOnce({
         ok: true,
         text: () => Promise.resolve('function fetched() {}'),
      });
      // Second fetch: post to Xano
      (global.fetch as jest.Mock).mockResolvedValueOnce({
         ok: true,
         json: () => Promise.resolve({ id: 2 }),
      });

      const item = {
         name: 'test-func',
         type: 'registry:function',
         files: [{ path: 'functions/test.xs', type: 'registry:function' }],
      };

      const results = await installRegistryItemToXano(
         item,
         mockContext,
         'https://registry.example.com',
         createMockCore(),
      );

      expect(results.installed).toHaveLength(1);
      expect(results.failed).toHaveLength(0);
   });

   it('should throw error when query install missing apiGroupId', async () => {
      const item = {
         name: 'test-query',
         type: 'registry:query',
         files: [{ path: 'queries/test.xs', type: 'registry:query' }],
      };

      // Fetch for file content
      (global.fetch as jest.Mock).mockResolvedValueOnce({
         ok: true,
         text: () => Promise.resolve('query content'),
      });

      const results = await installRegistryItemToXano(
         item,
         mockContext,
         'https://registry.example.com',
         createMockCore(),
      );

      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].error).toContain('apiGroupId required');
   });

   it('should map "already exists" errors to skipped', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
         ok: false,
         status: 409,
         json: () => Promise.resolve({ message: 'Resource already exists' }),
      });

      const item = {
         name: 'existing-func',
         type: 'registry:function',
         content: 'function existing() {}',
         files: [],
      };

      const results = await installRegistryItemToXano(
         item,
         mockContext,
         'https://registry.example.com',
         createMockCore(),
      );

      expect(results.skipped).toHaveLength(1);
      expect(results.skipped[0].reason).toContain('already exists');
      expect(results.failed).toHaveLength(0);
   });

   it('should throw when instanceConfig is null', async () => {
      const item = {
         name: 'test',
         type: 'registry:function',
         content: 'test',
         files: [],
      };

      await expect(
         installRegistryItemToXano(
            item,
            { ...mockContext, instanceConfig: null } as any,
            'https://registry.example.com',
            createMockCore(),
         ),
      ).rejects.toThrow('instanceConfig is required');
   });

   it('should report failed installs for non-duplicate HTTP errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
         ok: false,
         status: 500,
         json: () => Promise.resolve({ message: 'Internal server error' }),
      });

      const item = {
         name: 'bad-func',
         type: 'registry:function',
         content: 'function bad() {}',
         files: [],
      };

      const results = await installRegistryItemToXano(
         item,
         mockContext,
         'https://registry.example.com',
         createMockCore(),
      );

      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].error).toContain('Internal server error');
      expect(results.skipped).toHaveLength(0);
   });
});
