import { metaApiFetch, metaApiGet } from '../src/methods/api-helper';

function mockFetchOnce(response: unknown) {
   global.fetch = jest.fn().mockResolvedValue(response);
}

function firstFetchCall(): [string, any] {
   return (global.fetch as jest.Mock).mock.calls[0];
}

describe('metaApiFetch', () => {
   it('builds an /api:meta URL with expanded path params and query', async () => {
      mockFetchOnce({ ok: true });

      await metaApiFetch({
         baseUrl: 'https://x123.xano.io',
         token: 'test-token',
         path: '/workspace/{id}/function',
         pathParams: { id: 7 },
         query: { branch: 'main' },
      });

      const [url, init] = firstFetchCall();
      expect(url).toBe('https://x123.xano.io/api:meta/workspace/7/function?branch=main');
      expect(init.method).toBe('GET');
      expect(init.headers.Authorization).toBe('Bearer test-token');
   });

   it('serializes a JSON body and sets a JSON content type', async () => {
      mockFetchOnce({ ok: true });

      await metaApiFetch({
         baseUrl: 'https://x123.xano.io',
         token: 'test-token',
         method: 'POST',
         path: '/workspace/1/export',
         body: { branch: 'main' },
      });

      const [, init] = firstFetchCall();
      expect(init.body).toBe('{"branch":"main"}');
      expect(init.headers['Content-Type']).toBe('application/json');
   });

   it('passes a raw body through untouched without a default content type', async () => {
      mockFetchOnce({ ok: true });

      await metaApiFetch({
         baseUrl: 'https://x123.xano.io',
         token: 'test-token',
         method: 'POST',
         path: '/workspace/1/function',
         rawBody: 'function x() {}',
         headers: { 'Content-Type': 'text/x-xanoscript' },
      });

      const [, init] = firstFetchCall();
      expect(init.body).toBe('function x() {}');
      expect(init.headers['Content-Type']).toBe('text/x-xanoscript');
      expect(init.headers.Authorization).toBe('Bearer test-token');
   });
});

describe('metaApiRequest', () => {
   it('parses a JSON response', async () => {
      mockFetchOnce({ ok: true, json: () => Promise.resolve({ id: 1 }) });

      await expect(
         metaApiGet({ baseUrl: 'https://x.xano.io', token: 't', path: '/me' }),
      ).resolves.toEqual({ id: 1 });
   });

   it('throws with the API message on a failed response', async () => {
      mockFetchOnce({
         ok: false,
         status: 422,
         statusText: 'Unprocessable Entity',
         url: 'https://x.xano.io/api:meta/me',
         json: () => Promise.resolve({ message: 'bad input' }),
      });

      await expect(
         metaApiGet({ baseUrl: 'https://x.xano.io', token: 't', path: '/me' }),
      ).rejects.toThrow('Xano API GET https://x.xano.io/api:meta/me failed: bad input (422)');
   });
});
