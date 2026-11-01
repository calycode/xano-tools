jest.mock('@repo/utils', () => ({
   ...jest.requireActual('@repo/utils'),
   metaApiGet: jest.fn(),
}));

import { metaApiGet } from '@repo/utils';
import { buildXanoscriptRepoImplementation } from '../build-xanoscript-repo';

const mockedGet = metaApiGet as jest.Mock;

function delay(ms: number): Promise<void> {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

function entity(name: string, extra: Record<string, unknown> = {}) {
   return { id: name, name, xanoscript: { value: `${name} xs` }, ...extra };
}

function makeCore(emitted: any[]) {
   return {
      emit: jest.fn((type: string, event: any) => emitted.push({ type, ...event })),
      loadAndValidateContext: jest.fn(async () => ({
         instanceConfig: { name: 'prod', url: 'https://xano.test' },
         workspaceConfig: { id: 1 },
         branchConfig: { label: 'main' },
      })),
   } as any;
}

const storage = {
   getStartDir: () => '.',
   loadToken: async () => 'token',
} as any;

describe('buildXanoscriptRepoImplementation', () => {
   beforeEach(() => {
      mockedGet.mockReset();
   });

   it('fetches entities concurrently but keeps output paths in entity order', async () => {
      let active = 0;
      let maxActive = 0;

      mockedGet.mockImplementation(async ({ path, query }: any) => {
         active++;
         maxActive = Math.max(maxActive, active);
         try {
            // Table resolves first; function is slower. Output must still follow
            // SUPPORTED_ENTITIES (apigroup, function, table).
            if (path === '/workspace/1/function') await delay(20);
            else await delay(1);

            const page = query?.page ?? 1;
            if (page > 1) return { items: [] };

            if (path === '/workspace/1/apigroup') {
               return { items: [entity('group one', { id: 10 })] };
            }
            if (path === '/workspace/1/function') return { items: [entity('fn-b')] };
            if (path === '/workspace/1/table') return { items: [entity('tbl-a')] };
            if (path === '/workspace/1/apigroup/10/api') {
               return { items: [entity('users', { verb: 'get' })] };
            }
            return { items: [] };
         } finally {
            active--;
         }
      });

      const emitted: any[] = [];
      const results = await buildXanoscriptRepoImplementation({
         storage,
         core: makeCore(emitted),
         options: { instance: 'prod', workspace: 'main', branch: 'main' } as any,
      });

      expect(maxActive).toBe(4);
      expect(results.map((item) => item.path)).toEqual([
         'app/group_one/meta.json',
         'app/group_one/script.freezed.xs',
         'function/fn_b/meta.json',
         'function/fn_b/script.freezed.xs',
         'table/tbl_a/meta.json',
         'table/tbl_a/script.freezed.xs',
         'app/group_one/users/GET/meta.json',
         'app/group_one/users/GET/script.freezed.xs',
      ]);

      const fnMeta = JSON.parse(results[2].content);
      expect(fnMeta).toEqual({ id: 'fn-b', name: 'fn-b' });
      expect(results[3].content).toBe('fn-b xs');

      const progress = emitted.filter((event) => event.name === 'xs-repo-generation');
      expect(progress[0].type).toBe('start');
      expect(progress[progress.length - 1].type).toBe('end');
      const percentages = progress
         .filter((event) => event.type === 'progress')
         .map((event) => event.percent);
      expect(percentages.length).toBeGreaterThanOrEqual(16);
      expect(percentages).toEqual([...percentages].sort((a, b) => a - b));
   });

   it('rejects a non-JSON metadata response instead of returning an empty page', async () => {
      mockedGet.mockResolvedValue('not json');

      const emitted: any[] = [];

      await expect(
         buildXanoscriptRepoImplementation({
            storage,
            core: makeCore(emitted),
            options: { instance: 'prod', workspace: 'main', branch: 'main' } as any,
         })
      ).rejects.toThrow('Invalid metadata response for addon (page 1)');
   });

   it('rejects a metadata response without an items array', async () => {
      mockedGet.mockResolvedValue({});

      const emitted: any[] = [];

      await expect(
         buildXanoscriptRepoImplementation({
            storage,
            core: makeCore(emitted),
            options: { instance: 'prod', workspace: 'main', branch: 'main' } as any,
         })
      ).rejects.toThrow('Invalid metadata response for addon (page 1)');
   });

   it('stops emitting progress from in-flight mappers after a failure', async () => {
      mockedGet.mockImplementation(async ({ path }: any) => {
         if (path === '/workspace/1/addon') throw new Error('addon failed');
         if (path === '/workspace/1/agent') {
            await delay(30);
            return { items: [entity('agent-a')] };
         }
         await delay(1);
         return { items: [] };
      });

      const emitted: any[] = [];

      await expect(
         buildXanoscriptRepoImplementation({
            storage,
            core: makeCore(emitted),
            options: { instance: 'prod', workspace: 'main', branch: 'main' } as any,
         })
      ).rejects.toThrow('addon failed');

      const progressFrom = () =>
         emitted.filter(
            (event) => event.name === 'xs-repo-generation' && event.type === 'progress'
         ).length;
      const atFailure = progressFrom();

      // The slow in-flight mapper resolves after the rejection; it must not
      // report progress for a run that already failed.
      await delay(60);
      expect(progressFrom()).toBe(atFailure);
      expect(emitted.some((event) => event.type === 'end')).toBe(false);
   });

   it('fails fast when one entity fetch rejects', async () => {
      mockedGet.mockImplementation(async ({ path }: any) => {
         if (path === '/workspace/1/function') throw new Error('entity failed');
         await delay(1);
         return { items: [] };
      });

      const emitted: any[] = [];

      await expect(
         buildXanoscriptRepoImplementation({
            storage,
            core: makeCore(emitted),
            options: { instance: 'prod', workspace: 'main', branch: 'main' } as any,
         })
      ).rejects.toThrow('entity failed');

      expect(emitted.some((event) => event.type === 'end')).toBe(false);
   });
});
