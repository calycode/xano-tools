import net from 'node:net';

/** Default port the OpenCode server prefers. */
export const DEFAULT_OPENCODE_PORT = 4096;

/** Number of contiguous ports scanned before asking the OS for a free port. */
export const OPENCODE_PORT_SCAN_SIZE = 32;

export const OPENCODE_PORT_SCAN_START = DEFAULT_OPENCODE_PORT;
export const OPENCODE_PORT_SCAN_END = DEFAULT_OPENCODE_PORT + OPENCODE_PORT_SCAN_SIZE - 1;

const PORT_PROBE_HOST = '127.0.0.1';
const EPHEMERAL_PORT_ATTEMPTS = 5;

export type PortAvailabilityCheck = (port: number) => Promise<boolean>;
export type EphemeralPortProvider = () => Promise<number>;

export interface PortSelection {
   port: number;
   requestedPort: number | null;
   autoSelected: boolean;
   source: 'requested' | 'scan' | 'ephemeral';
}

export interface SelectAvailablePortOptions {
   isAvailable?: PortAvailabilityCheck;
   getEphemeralPort?: EphemeralPortProvider;
   scanStart?: number;
   scanEnd?: number;
   exclude?: Iterable<number>;
}

/** Validate an integer TCP port in the inclusive 1-65535 range. */
function validatePortRange(port: number): void {
   if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port number: ${port}. Must be an integer between 1 and 65535.`);
   }
}

/**
 * Normalize a port request from the CLI or the native messaging protocol.
 *
 * `undefined`, `null`, an empty string, `0`, and `"auto"` all mean "let the
 * host choose". Anything else must be a valid TCP port.
 */
export function parsePortRequest(value: unknown): number | null {
   if (value === undefined || value === null) {
      return null;
   }

   if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || trimmed.toLowerCase() === 'auto') {
         return null;
      }

      if (!/^\d+$/.test(trimmed)) {
         throw new Error(`Invalid port number: ${value}`);
      }

      const parsed = Number.parseInt(trimmed, 10);
      if (parsed === 0) {
         return null;
      }

      validatePortRange(parsed);
      return parsed;
   }

   if (typeof value === 'number') {
      if (value === 0) {
         return null;
      }

      validatePortRange(value);
      return value;
   }

   throw new Error(`Invalid port number: ${String(value)}`);
}

/**
 * Check whether a TCP port can be bound on the local loopback interface.
 *
 * This is a bind test rather than an HTTP probe: a port can be occupied by a
 * process that does not answer HTTP requests, and an HTTP probe against a
 * different service would otherwise look like a successful server startup.
 */
export function isPortAvailable(port: number, host: string = PORT_PROBE_HOST): Promise<boolean> {
   try {
      validatePortRange(port);
   } catch {
      return Promise.resolve(false);
   }

   return new Promise((resolve) => {
      const server = net.createServer();
      let settled = false;

      const finish = (available: boolean) => {
         if (settled) {
            return;
         }
         settled = true;
         server.removeAllListeners();
         resolve(available);
      };

      server.once('error', () => finish(false));
      server.listen({ port, host, exclusive: true }, () => {
         server.close(() => finish(true));
      });
   });
}

/**
 * Ask the OS for a free ephemeral port by binding to port 0.
 */
export function getEphemeralPort(host: string = PORT_PROBE_HOST): Promise<number> {
   return new Promise((resolve, reject) => {
      const server = net.createServer();

      server.once('error', reject);
      server.listen({ port: 0, host, exclusive: true }, () => {
         const address = server.address();
         const port = address && typeof address === 'object' ? address.port : 0;

         server.close((error) => {
            if (error) {
               reject(error);
               return;
            }

            if (!port) {
               reject(new Error('The operating system did not return an ephemeral port.'));
               return;
            }

            resolve(port);
         });
      });
   });
}

/**
 * Pick the port the OpenCode server should bind to.
 *
 * Order of preference:
 * 1. the requested port, when it is free;
 * 2. the next free port in the configured scan range;
 * 3. an OS-assigned ephemeral port.
 *
 * The caller gets the actual port back and should report it to the browser
 * extension, because a requested port is a preference rather than a guarantee.
 */
export async function selectAvailablePort(
   requestedPort: number | null,
   options: SelectAvailablePortOptions = {},
): Promise<PortSelection> {
   const isAvailable = options.isAvailable ?? isPortAvailable;
   const getEphemeral = options.getEphemeralPort ?? getEphemeralPort;
   const scanStart = options.scanStart ?? OPENCODE_PORT_SCAN_START;
   const scanEnd = options.scanEnd ?? OPENCODE_PORT_SCAN_END;
   const excluded = new Set<number>(options.exclude ?? []);

   if (requestedPort !== null) {
      validatePortRange(requestedPort);
      if (!excluded.has(requestedPort) && (await isAvailable(requestedPort))) {
         return {
            port: requestedPort,
            requestedPort,
            autoSelected: false,
            source: 'requested',
         };
      }
   }

   for (let port = scanStart; port <= scanEnd; port++) {
      if (excluded.has(port) || port === requestedPort) {
         continue;
      }

      if (await isAvailable(port)) {
         return {
            port,
            requestedPort,
            autoSelected: true,
            source: 'scan',
         };
      }
   }

   for (let attempt = 0; attempt < EPHEMERAL_PORT_ATTEMPTS; attempt++) {
      const port = await getEphemeral();
      if (!excluded.has(port) && (await isAvailable(port))) {
         return {
            port,
            requestedPort,
            autoSelected: true,
            source: 'ephemeral',
         };
      }
   }

   throw new Error(
      `No available port found. Tried ${requestedPort ?? 'none'}, ` +
      `${scanStart}-${scanEnd}, and ${EPHEMERAL_PORT_ATTEMPTS} ephemeral ports.`,
   );
}

export { validatePortRange as validateOpenCodePort };
