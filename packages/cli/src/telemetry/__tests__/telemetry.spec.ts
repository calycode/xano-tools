import { spawn } from 'node:child_process';
import {
   isTelemetryEnabled,
   MAX_TELEMETRY_PAYLOAD_CHARS,
   TELEMETRY_PAYLOAD_ENV,
   TELEMETRY_SINK_ENV,
} from '../config';
import { createDetachedDispatcher } from '../detached-dispatcher';
import { createTelemetry } from '../index';
import {
   isTelemetrySinkInvocation,
   maybeRunTelemetrySink,
   sendTelemetryEvents,
   TelemetryClient,
} from '../sink';

function mockChild() {
   return {
      on: jest.fn(),
      unref: jest.fn(),
   };
}

describe('telemetry', () => {
   describe('ordering and lifecycle', () => {
      it('records synchronously without touching the dispatcher', () => {
         const dispatch = jest.fn(() => new Promise<void>(() => undefined));
         const analytics = createTelemetry({ env: {}, dispatch });

         const startedAt = performance.now();
         analytics.recordEvent('command_started', { command: 'status' });
         const elapsed = performance.now() - startedAt;

         expect(elapsed).toBeLessThan(50);
         expect(dispatch).not.toHaveBeenCalled();

         // The hanging dispatcher must not matter: callers fire and forget.
         void analytics.shutdown();
      });

      it('dispatches queued events once during shutdown', async () => {
         const dispatch = jest.fn();
         const analytics = createTelemetry({ env: {}, dispatch });

         analytics.recordEvent('command_started', { command: 'status' });
         analytics.recordEvent('command_finished', { command: 'oc status' });

         // The dispatcher is invoked synchronously so callers can shut down and
         // then exit immediately (see gracefulExit).
         const pending = analytics.shutdown();
         expect(dispatch).toHaveBeenCalledTimes(1);

         await pending;
         await analytics.shutdown();

         expect(dispatch).toHaveBeenCalledTimes(1);
         expect(dispatch).toHaveBeenCalledWith([
            { event: 'command_started', properties: { command: 'status' } },
            { event: 'command_finished', properties: { command: 'oc status' } },
         ]);
      });
   });

   describe('opt-out', () => {
      it.each([
         ['CALY_TELEMETRY=0', { CALY_TELEMETRY: '0' }],
         ['CALY_TELEMETRY=false', { CALY_TELEMETRY: 'false' }],
         ['DO_NOT_TRACK=1', { DO_NOT_TRACK: '1' }],
      ])('sends nothing when %s', async (_label, env) => {
         const dispatch = jest.fn();
         const analytics = createTelemetry({ env, dispatch });

         analytics.recordEvent('command_started', { command: 'status' });
         await analytics.shutdown();

         expect(dispatch).not.toHaveBeenCalled();
      });

      it('is enabled by default', () => {
         expect(isTelemetryEnabled({})).toBe(true);
         expect(isTelemetryEnabled({ CALY_TELEMETRY: '1' })).toBe(true);
         expect(isTelemetryEnabled({ DO_NOT_TRACK: '0' })).toBe(true);
      });
   });

   describe('failure isolation', () => {
      it('resolves when the dispatcher rejects', async () => {
         const dispatch = jest.fn(() =>
            Promise.reject(new Error('network down'))
         );
         const analytics = createTelemetry({ env: {}, dispatch });
         analytics.recordEvent('command_started');

         await expect(analytics.shutdown()).resolves.toBeUndefined();
      });

      it('resolves when the dispatcher throws synchronously', async () => {
         const dispatch = jest.fn(() => {
            throw new Error('spawn failed');
         });
         const analytics = createTelemetry({ env: {}, dispatch });
         analytics.recordEvent('command_started');

         await expect(analytics.shutdown()).resolves.toBeUndefined();
      });
   });
});

describe('detached dispatcher', () => {
   it('spawns a detached sink with the encoded batch', () => {
      const child = mockChild();
      const spawnProcess = jest.fn(() => child);
      const dispatch = createDetachedDispatcher({
         env: { PATH: '/bin' },
         execPath: 'node',
         scriptPath: '/app/dist/index.cjs',
         fileExists: () => true,
         isSea: () => false,
         spawnProcess: spawnProcess as unknown as typeof spawn,
      });

      dispatch([{ event: 'command_started', properties: { command: 'status' } }]);

      expect(spawnProcess).toHaveBeenCalledTimes(1);
      const [command, args, options] = spawnProcess.mock.calls[0] as any[];
      expect(command).toBe('node');
      expect(args).toEqual(['/app/dist/index.cjs']);
      expect(options.detached).toBe(true);
      expect(options.stdio).toBe('ignore');
      expect(options.env[TELEMETRY_SINK_ENV]).toBe('1');

      const payload = JSON.parse(
         Buffer.from(options.env[TELEMETRY_PAYLOAD_ENV], 'base64').toString()
      );
      expect(payload).toEqual([
         { event: 'command_started', properties: { command: 'status' } },
      ]);

      expect(child.unref).toHaveBeenCalled();
      expect(child.on).toHaveBeenCalledWith('error', expect.any(Function));
   });

   it('swallows spawn failures', () => {
      const dispatch = createDetachedDispatcher({
         execPath: 'node',
         scriptPath: '/app/dist/index.cjs',
         fileExists: () => true,
         isSea: () => false,
         spawnProcess: (() => {
            throw new Error('ENOENT');
         }) as unknown as typeof spawn,
      });

      expect(() => dispatch([{ event: 'command_started' }])).not.toThrow();
   });

   it('drops batches that exceed the environment payload limit', () => {
      const spawnProcess = jest.fn();
      const dispatch = createDetachedDispatcher({
         execPath: 'node',
         scriptPath: '/app/dist/index.cjs',
         fileExists: () => true,
         isSea: () => false,
         spawnProcess: spawnProcess as unknown as typeof spawn,
      });

      dispatch([
         {
            event: 'command_started',
            properties: { blob: 'x'.repeat(MAX_TELEMETRY_PAYLOAD_CHARS) },
         },
      ]);

      expect(spawnProcess).not.toHaveBeenCalled();
   });

   it('skips launching when no safe entry point can be found', () => {
      const spawnProcess = jest.fn();
      const dispatch = createDetachedDispatcher({
         execPath: 'node',
         scriptPath: 'caly.exe',
         fileExists: () => true,
         isSea: () => false,
         spawnProcess: spawnProcess as unknown as typeof spawn,
      });

      dispatch([{ event: 'command_started' }]);

      expect(spawnProcess).not.toHaveBeenCalled();
   });
});

describe('sink', () => {
   it('only takes over when the sink flag is set', () => {
      expect(isTelemetrySinkInvocation({})).toBe(false);
      expect(isTelemetrySinkInvocation({ [TELEMETRY_SINK_ENV]: '1' })).toBe(true);
      expect(maybeRunTelemetrySink({})).toBe(false);
   });

   it('captures anonymous events with the person profile disabled', async () => {
      const client: TelemetryClient = {
         capture: jest.fn(),
         shutdown: jest.fn().mockResolvedValue(undefined),
      };

      await sendTelemetryEvents(
         [{ event: 'command_finished', properties: { duration: '0.14' } }],
         { createClient: () => client }
      );

      expect(client.capture).toHaveBeenCalledWith({
         distinctId: 'anonymous',
         event: 'command_finished',
         properties: {
            duration: '0.14',
            $process_person_profile: false,
         },
      });
      expect(client.shutdown).toHaveBeenCalled();
   });

   it('resolves when the client shutdown rejects', async () => {
      const client: TelemetryClient = {
         capture: jest.fn(),
         shutdown: jest.fn().mockRejectedValue(new Error('offline')),
      };

      await expect(
         sendTelemetryEvents([{ event: 'command_started' }], {
            createClient: () => client,
         })
      ).resolves.toBeUndefined();
   });

   it('resolves when the client cannot be created', async () => {
      await expect(
         sendTelemetryEvents([{ event: 'command_started' }], {
            createClient: () => {
               throw new Error('bad key');
            },
         })
      ).resolves.toBeUndefined();
   });
});
