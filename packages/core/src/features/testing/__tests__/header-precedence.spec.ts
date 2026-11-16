import { testRunner } from '../index';

const fullConfigs = {
   instanceConfig: { name: 'prod', url: 'https://prod.xano.io' },
   workspaceConfig: { id: 1, name: 'main' },
   branchConfig: { id: 10, label: 'master' },
} as any;

const group = {
   id: 1,
   name: 'demo',
   canonical: 'demo',
   // Supplied so the runner does not fetch a remote spec.
   oas: {},
} as any;

function makeCore() {
   return {
      emit: jest.fn(),
      loadToken: jest.fn(),
      loadAndValidateContext: jest.fn(async () => fullConfigs),
   } as any;
}

function makeResponse() {
   return {
      status: 200,
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ ok: true }),
      text: async () => '{"ok":true}',
   } as any;
}

const storage = { getStartDir: () => '.' } as any;
const originalFetch = globalThis.fetch;

afterEach(() => {
   globalThis.fetch = originalFetch;
});

async function runWithHeaders(headers: Record<string, string>) {
   const fetchMock = jest.fn(async () => makeResponse());
   globalThis.fetch = fetchMock as any;

   await testRunner({
      context: { instance: 'prod', workspace: 'main', branch: 'master' },
      groups: [group],
      testConfig: [
         {
            path: '/health',
            method: 'GET',
            headers,
            queryParams: null,
            requestBody: null,
         },
      ],
      core: makeCore(),
      storage,
      contextConfigs: fullConfigs,
   });

   return (fetchMock.mock.calls[0] as any[])[1].headers;
}

describe('testRunner headers', () => {
   it('lets explicit headers win over the runner defaults', async () => {
      const headers = await runWithHeaders({
         'X-Data-Source': 'live',
         'X-Branch': 'custom-branch',
      });

      expect(headers['X-Data-Source']).toBe('live');
      expect(headers['X-Branch']).toBe('custom-branch');
   });

   it('falls back to test/live defaults when no header is set', async () => {
      const headers = await runWithHeaders({});

      expect(headers['X-Data-Source']).toBe('test');
      expect(headers['X-Branch']).toBe('master');
   });
});
