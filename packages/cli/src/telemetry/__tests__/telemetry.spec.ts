import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isTelemetryEnabled, TELEMETRY_SINK_ENV } from '../config';
import { createDetachedDispatcher } from '../detached-dispatcher';
import { createTelemetry } from '../index';
import {
   isTelemetrySinkInvocation,
   maybeRunTelemetrySink,
   sendTelemetryEvents,
   SINK_HARD_LIMIT_MS,
   TelemetryClient,
} from '../sink';
import {
   createEventSpool,
   createSinkLock,
   defaultSinkLockPath,
   type EventSpool,
} from '../spool';
import type { TelemetryEvent } from '../types';

function mockChild() {
   return {
      pid: 4242,
      on: jest.fn(),
      unref: jest.fn(),
   };
}

function makeTempDir(): string {
   return mkdtempSync(join(tmpdir(), 'caly-telemetry-'));
}

function fakeSpool(): EventSpool & { events: unknown[] } {
   return {
      path: '/tmp/spool.jsonl',
      events: [],
      append(events) {
         this.events.push(...events);
         return true;
      },
      drain() {
         return [];
      },
   };
}

function fakeLock() {
   return {
      path: '/tmp/sink.lock',
      held: false,
      identify: jest.fn(),
      own: jest.fn(),
      acquire: jest.fn(function () {
         if (this.held) return false;
         this.held = true;
         return true;
      }),
      release: jest.fn(function () {
         this.held = false;
      }),
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
         const dispatch = jest.fn(() => Promise.reject(new Error('network down')));
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
   it('spools the batch and spawns one flusher', () => {
      const child = mockChild();
      const spawnProcess = jest.fn(() => child);
      const spool = fakeSpool();
      const lock = fakeLock();
      const dispatch = createDetachedDispatcher({
         env: { PATH: '/bin' },
         execPath: 'node',
         scriptPath: '/app/dist/index.cjs',
         fileExists: () => true,
         isSea: () => false,
         spawnProcess: spawnProcess as unknown as typeof spawn,
         spool,
         lock,
      });

      dispatch([{ event: 'command_started', properties: { command: 'status' } }]);

      expect(spool.events).toEqual([
         { event: 'command_started', properties: { command: 'status' } },
      ]);
      expect(spawnProcess).toHaveBeenCalledTimes(1);
      const [command, args, options] = spawnProcess.mock.calls[0] as any[];
      expect(command).toBe('node');
      expect(args).toEqual(['/app/dist/index.cjs']);
      expect(options.detached).toBe(true);
      expect(options.stdio).toBe('ignore');
      expect(options.env[TELEMETRY_SINK_ENV]).toBe('1');
      expect(options.env.CALY_TELEMETRY_SPOOL).toBe('/tmp/spool.jsonl');
      expect(options.env.CALY_TELEMETRY_LOCK).toBe('/tmp/sink.lock');

      expect(lock.identify).toHaveBeenCalledWith(4242);
      expect(child.unref).toHaveBeenCalled();
      expect(child.on).toHaveBeenCalledWith('error', expect.any(Function));
   });

   it('does not spawn a second flusher while one holds the lock', () => {
      const spawnProcess = jest.fn(() => mockChild());
      const spool = fakeSpool();
      const lock = fakeLock();
      lock.held = true;

      const dispatch = createDetachedDispatcher({
         env: {},
         execPath: 'node',
         scriptPath: '/app/dist/index.cjs',
         fileExists: () => true,
         isSea: () => false,
         spawnProcess: spawnProcess as unknown as typeof spawn,
         spool,
         lock,
      });

      dispatch([{ event: 'command_started' }]);

      // The batch is still spooled for the running flusher / next run.
      expect(spool.events).toHaveLength(1);
      expect(spawnProcess).not.toHaveBeenCalled();
   });

   it('releases the lock when no safe entry point can be found', () => {
      const lock = fakeLock();
      const dispatch = createDetachedDispatcher({
         execPath: 'node',
         scriptPath: 'caly.exe',
         fileExists: () => true,
         isSea: () => false,
         spawnProcess: jest.fn() as unknown as typeof spawn,
         spool: fakeSpool(),
         lock,
      });

      dispatch([{ event: 'command_started' }]);

      expect(lock.release).toHaveBeenCalled();
   });

   it('releases the lock when spawning throws', () => {
      const lock = fakeLock();
      const dispatch = createDetachedDispatcher({
         execPath: 'node',
         scriptPath: '/app/dist/index.cjs',
         fileExists: () => true,
         isSea: () => false,
         spawnProcess: (() => {
            throw new Error('ENOENT');
         }) as unknown as typeof spawn,
         spool: fakeSpool(),
         lock,
      });

      expect(() => dispatch([{ event: 'command_started' }])).not.toThrow();
      expect(lock.release).toHaveBeenCalled();
   });

   it('ignores empty batches', () => {
      const spawnProcess = jest.fn();
      const spool = fakeSpool();
      const dispatch = createDetachedDispatcher({
         execPath: 'node',
         scriptPath: '/app/dist/index.cjs',
         fileExists: () => true,
         isSea: () => false,
         spawnProcess: spawnProcess as unknown as typeof spawn,
         spool,
         lock: fakeLock(),
      });

      dispatch([]);

      expect(spool.events).toHaveLength(0);
      expect(spawnProcess).not.toHaveBeenCalled();
   });
});

describe('event spool', () => {
   let dir: string;

   beforeEach(() => {
      dir = makeTempDir();
   });

   afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
   });

   it('round-trips appended batches and removes the file on drain', () => {
      const spool = createEventSpool(join(dir, 'spool.jsonl'));

      spool.append([{ event: 'command_started', properties: { command: 'a' } }]);
      spool.append([{ event: 'command_finished' }]);

      expect(spool.drain()).toEqual([
         { event: 'command_started', properties: { command: 'a' } },
         { event: 'command_finished' },
      ]);
      expect(spool.drain()).toEqual([]);
   });

   it('skips corrupt lines without dropping the rest', () => {
      const path = join(dir, 'spool.jsonl');
      writeFileSync(path, 'not json\n{"event":"kept"}\n');

      const spool = createEventSpool(path);

      expect(spool.drain()).toEqual([{ event: 'kept' }]);
   });

   it('stops appending once the spool is full', () => {
      const path = join(dir, 'spool.jsonl');
      const spool = createEventSpool(path);
      const big = { event: 'command_started', properties: { blob: 'x'.repeat(250_000) } };

      expect(spool.append([big])).toBe(true);
      expect(spool.append([big])).toBe(true);
      expect(spool.append([big])).toBe(false);
      expect(statSync(path).size).toBeLessThanOrEqual(512 * 1024);
   });
});

describe('sink lock', () => {
   let dir: string;

   beforeEach(() => {
      dir = makeTempDir();
   });

   afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
   });

   it('derives a different default lock for each spool path', () => {
      const one = defaultSinkLockPath({
         CALY_TELEMETRY_SPOOL: join(dir, 'one.jsonl'),
      });
      const two = defaultSinkLockPath({
         CALY_TELEMETRY_SPOOL: join(dir, 'two.jsonl'),
      });

      expect(one).not.toBe(two);
      // The same spool always maps to the same lock, so the two wrappers that
      // share a spool still share one flusher.
      expect(
         defaultSinkLockPath({ CALY_TELEMETRY_SPOOL: join(dir, 'one.jsonl') })
      ).toBe(one);
   });

   it('lets CALY_TELEMETRY_LOCK override the spool-derived default', () => {
      const override = join(dir, 'explicit.lock');

      expect(
         defaultSinkLockPath({
            CALY_TELEMETRY_SPOOL: join(dir, 'one.jsonl'),
            CALY_TELEMETRY_LOCK: override,
         })
      ).toBe(override);
      expect(defaultSinkLockPath({ CALY_TELEMETRY_LOCK: override })).toBe(override);
   });

   it('allows only one holder at a time', () => {
      const lock = createSinkLock(join(dir, 'sink.lock'));

      expect(lock.acquire()).toBe(true);
      expect(lock.acquire()).toBe(false);

      lock.release();
      expect(lock.acquire()).toBe(true);
   });

   it('replaces a stale lock left by a crashed flusher', () => {
      const path = join(dir, 'sink.lock');
      writeFileSync(path, '999\n0');
      utimesSync(path, new Date(0), new Date(0));

      const lock = createSinkLock(path);

      expect(lock.acquire()).toBe(true);
   });
});

describe('sink', () => {
   it('only takes over when the sink flag is set', () => {
      expect(isTelemetrySinkInvocation({})).toBe(false);
      expect(isTelemetrySinkInvocation({ [TELEMETRY_SINK_ENV]: '1' })).toBe(true);
      expect(maybeRunTelemetrySink({})).toBe(false);
   });

   it('drains the spool, sends, releases the lock and exits', async () => {
      const spool = fakeSpool();
      const batches = [[{ event: 'command_finished' }]];
      spool.drain = () => batches.shift() ?? [];
      const lock = fakeLock();
      const send = jest.fn().mockResolvedValue(undefined);
      const exit = jest.fn() as unknown as (code: number) => never;

      const tookOver = maybeRunTelemetrySink(
         { [TELEMETRY_SINK_ENV]: '1' },
         { spool, lock, send, exit }
      );

      expect(tookOver).toBe(true);
      await new Promise((resolve) => setImmediate(resolve));

      expect(send).toHaveBeenCalledWith([{ event: 'command_finished' }]);
      expect(lock.own).toHaveBeenCalled();
      expect(lock.release).toHaveBeenCalled();
      expect(exit).toHaveBeenCalledWith(0);
   });

   it('sends a batch appended while the first send is in flight', async () => {
      const lock = fakeLock();
      const spool = fakeSpool();
      // The first drain empties the spool; a command appends the second batch
      // while the first send is still running (it cannot take the lock).
      const batches: TelemetryEvent[][] = [[{ event: 'command_started' }]];
      spool.drain = () => batches.shift() ?? [];
      let sends = 0;
      const send = jest.fn(async () => {
         sends += 1;
         if (sends === 1) batches.push([{ event: 'command_finished' }]);
      });
      const exit = jest.fn() as unknown as (code: number) => never;

      maybeRunTelemetrySink(
         { [TELEMETRY_SINK_ENV]: '1' },
         { spool, lock, send, exit }
      );
      await new Promise((resolve) => setImmediate(resolve));

      expect(send).toHaveBeenNthCalledWith(1, [{ event: 'command_started' }]);
      expect(send).toHaveBeenNthCalledWith(2, [{ event: 'command_finished' }]);
      expect(send).toHaveBeenCalledTimes(2);
      expect(exit).toHaveBeenCalledWith(0);
   });

   it('exits without sending when telemetry is disabled', () => {
      const spool = fakeSpool();
      const lock = fakeLock();
      const send = jest.fn();
      const exit = jest.fn() as unknown as (code: number) => never;

      maybeRunTelemetrySink(
         { [TELEMETRY_SINK_ENV]: '1', CALY_TELEMETRY: '0' },
         { spool, lock, send, exit }
      );

      expect(send).not.toHaveBeenCalled();
      expect(lock.release).toHaveBeenCalled();
      expect(exit).toHaveBeenCalledWith(0);
   });

   it('exits at the hard deadline even if sending never settles', () => {
      jest.useFakeTimers();
      const exit = jest.fn() as unknown as (code: number) => never;
      const lock = fakeLock();
      const spool = fakeSpool();
      spool.drain = () => [{ event: 'command_started' }];

      maybeRunTelemetrySink(
         { [TELEMETRY_SINK_ENV]: '1' },
         {
            spool,
            lock,
            send: () => new Promise<void>(() => undefined),
            exit,
         }
      );

      jest.advanceTimersByTime(SINK_HARD_LIMIT_MS);

      expect(exit).toHaveBeenCalledWith(0);
      expect(lock.release).toHaveBeenCalled();
      jest.useRealTimers();
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
