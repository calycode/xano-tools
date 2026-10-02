import http from 'node:http';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticServer } from '../static-server';

function listen(server: http.Server): Promise<number> {
   return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, () => {
         const address = server.address();
         resolve(typeof address === 'object' && address ? address.port : 0);
      });
   });
}

function close(server: http.Server): Promise<void> {
   return new Promise((resolve) => server.close(() => resolve()));
}

function rawGetStatus(port: number, rawPath: string): Promise<number> {
   return new Promise((resolve, reject) => {
      const req = http.request({ host: 'localhost', port, path: rawPath, method: 'GET' }, (res) => {
         res.resume();
         resolve(res.statusCode || 0);
      });
      req.on('error', reject);
      req.end();
   });
}

describe('createStaticServer', () => {
   let directory: string;
   let server: http.Server;
   let port: number;

   beforeAll(async () => {
      directory = await mkdtemp(join(tmpdir(), 'caly-static-'));
      await writeFile(join(directory, 'index.json'), '{"ok":true}');
      await mkdir(join(directory, 'sub'));
      await writeFile(join(directory, 'sub', 'index.html'), '<h1>hi</h1>');

      server = createStaticServer({ root: directory, label: 'test' });
      port = await listen(server);
   });

   afterAll(async () => {
      await close(server);
      await rm(directory, { recursive: true, force: true });
   });

   it('serves a file with a json content type', async () => {
      const res = await fetch(`http://localhost:${port}/index.json`);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');
      expect(await res.text()).toBe('{"ok":true}');
   });

   it('serves index.html for a directory', async () => {
      const res = await fetch(`http://localhost:${port}/sub/`);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe('<h1>hi</h1>');
   });

   it('returns 404 for a missing file', async () => {
      const res = await fetch(`http://localhost:${port}/nope.txt`);
      expect(res.status).toBe(404);
   });

   it('returns 403 for path traversal', async () => {
      expect(await rawGetStatus(port, '/../secret.txt')).toBe(403);
   });
});

describe('createStaticServer validation', () => {
   it('throws a labelled error when the root does not exist', () => {
      expect(() =>
         createStaticServer({
            root: join(tmpdir(), 'caly-missing-registry-xyz'),
            label: 'registry',
         }),
      ).toThrow(/registry directory not found/);
   });
});
