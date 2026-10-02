import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { noteBox } from './note-box';

const MIME_TYPES: Record<string, string> = {
   '.html': 'text/html; charset=utf-8',
   '.htm': 'text/html; charset=utf-8',
   '.js': 'text/javascript; charset=utf-8',
   '.mjs': 'text/javascript; charset=utf-8',
   '.css': 'text/css; charset=utf-8',
   '.json': 'application/json; charset=utf-8',
   '.yaml': 'text/yaml; charset=utf-8',
   '.yml': 'text/yaml; charset=utf-8',
   '.md': 'text/markdown; charset=utf-8',
   '.svg': 'image/svg+xml',
   '.png': 'image/png',
   '.jpg': 'image/jpeg',
   '.jpeg': 'image/jpeg',
   '.gif': 'image/gif',
   '.ico': 'image/x-icon',
   '.woff': 'font/woff',
   '.woff2': 'font/woff2',
   '.txt': 'text/plain; charset=utf-8',
   '.map': 'application/json; charset=utf-8',
};

export interface StaticServerOptions {
   /** Directory to serve. */
   root: string;
   cors?: boolean;
   /** Human label used in log/error messages (e.g. "registry", "OpenAPI spec"). */
   label?: string;
   /** Hint shown when the directory does not exist. */
   missingHint?: string;
}

/**
 * Build (but do not start) a static file server for a directory. Validates that
 * the directory exists so callers never serve a bare 404 page.
 */
export function createStaticServer({
   root,
   cors = false,
   label = 'assets',
   missingHint,
}: StaticServerOptions): http.Server {
   const rootDir = path.resolve(root);

   if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
      throw new Error(
         `${label} directory not found at ${rootDir}.${missingHint ? ' ' + missingHint : ''}`,
      );
   }

   return http.createServer((req, res) => {
      try {
         if (cors) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
         }

         if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
         }

         const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
         let filePath = path.join(rootDir, urlPath);

         // Block path traversal outside the served root.
         if (filePath !== rootDir && !filePath.startsWith(rootDir + path.sep)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
         }

         if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, 'index.html');
         }

         if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`Not found: ${urlPath}`);
            return;
         }

         const ext = path.extname(filePath).toLowerCase();
         const stream = fs.createReadStream(filePath);
         stream.on('error', () => {
            if (!res.headersSent) {
               res.writeHead(500, { 'Content-Type': 'text/plain' });
               res.end('Internal server error');
            } else {
               res.end();
            }
         });
         stream.on('open', () => {
            if (!res.headersSent) {
               res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            }
         });
         stream.pipe(res);
      } catch {
         res.writeHead(500, { 'Content-Type': 'text/plain' });
         res.end('Internal server error');
      }
   });
}

export interface ServeStaticDirectoryOptions extends StaticServerOptions {
   port: number;
   /**
    * Path appended to the local URL so the printed link opens something useful
    * (e.g. `/index.json` for a registry).
    */
   entryPath?: string;
}

/**
 * Serve a directory over HTTP until the server closes (Ctrl-C).
 * Resolves once the server is listening is not needed by callers, so this keeps
 * running; use `createStaticServer` directly for testable, controllable servers.
 */
export async function serveStaticDirectory(options: ServeStaticDirectoryOptions): Promise<void> {
   const portNumber = Number(options.port);
   if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
      throw new Error(`Invalid port: ${options.port}. Must be an integer between 1 and 65535.`);
   }

   const server = createStaticServer(options);

   await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(portNumber, () => resolve());
   });

   const entryUrl = `http://localhost:${portNumber}${options.entryPath ?? '/'}`;
   noteBox(
      [
         `Serving ${options.label ?? 'assets'}${options.cors ? ' (CORS enabled)' : ''}`,
         '',
         `➜ ${entryUrl}`,
         '',
         `Files: ${path.resolve(options.root)}`,
         'Press Ctrl+C to stop',
      ].join('\n'),
      'Local server ready',
   );

   await new Promise<void>((resolve) => server.on('close', () => resolve()));
}
