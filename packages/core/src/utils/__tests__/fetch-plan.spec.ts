import { fetchAllPages, mapConcurrent } from '../methods/fetch-plan';

function delay(ms: number): Promise<void> {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('mapConcurrent', () => {
   it('never runs more mappers than the concurrency limit', async () => {
      let active = 0;
      let maxActive = 0;
      const items = Array.from({ length: 9 }, (_, i) => i);

      const results = await mapConcurrent(
         items,
         async (item) => {
            active++;
            maxActive = Math.max(maxActive, active);
            await delay(5);
            active--;
            return item * 2;
         },
         { concurrency: 3 }
      );

      expect(maxActive).toBe(3);
      expect(results).toEqual(items.map((item) => item * 2));
   });

   it('returns results in input order even when work completes out of order', async () => {
      const items = [0, 1, 2, 3, 4];

      const results = await mapConcurrent(
         items,
         async (item) => {
            await delay((items.length - item) * 2);
            return `item-${item}`;
         },
         { concurrency: 2 }
      );

      expect(results).toEqual(['item-0', 'item-1', 'item-2', 'item-3', 'item-4']);
   });

   it('aborts scheduling after the first rejection', async () => {
      const started: number[] = [];
      const items = Array.from({ length: 10 }, (_, i) => i);

      const run = mapConcurrent(
         items,
         async (item) => {
            started.push(item);
            if (item === 1) throw new Error('boom');
            await delay(5);
            return item;
         },
         { concurrency: 2 }
      );

      await expect(run).rejects.toThrow('boom');
      await delay(20);

      expect(started).toEqual([0, 1]);
   });
});

describe('fetchAllPages', () => {
   it('requests page 2 and beyond until the response is exhausted', async () => {
      const pages = [
         ['a', 'b'],
         ['c', 'd'],
         ['e'],
      ];
      const fetchPage = jest.fn(async ({ page }: { page: number; perPage: number }) => ({
         items: pages[page - 1] ?? [],
      }));

      const result = await fetchAllPages({ fetchPage, perPage: 2 });

      expect(result).toEqual(['a', 'b', 'c', 'd', 'e']);
      expect(fetchPage.mock.calls.map(([request]) => request.page)).toEqual([1, 2, 3]);
      expect(fetchPage.mock.calls.map(([request]) => request.perPage)).toEqual([2, 2, 2]);
   });

   it('stops after an empty page when the last full page ends exactly on the boundary', async () => {
      const pages = [
         ['a', 'b'],
         ['c', 'd'],
         [],
      ];
      const fetchPage = jest.fn(async ({ page }: { page: number }) => ({
         items: pages[page - 1] ?? [],
      }));

      const result = await fetchAllPages({ fetchPage, perPage: 2 });

      expect(result).toEqual(['a', 'b', 'c', 'd']);
      expect(fetchPage).toHaveBeenCalledTimes(3);
   });

   it('honours a numeric total', async () => {
      const fetchPage = jest.fn(async ({ page }: { page: number }) => ({
         items: page === 1 ? ['a', 'b'] : ['c', 'd'],
         total: 4,
      }));

      const result = await fetchAllPages({ fetchPage, perPage: 2 });

      expect(result).toEqual(['a', 'b', 'c', 'd']);
      expect(fetchPage).toHaveBeenCalledTimes(2);
   });

   it('stops when next is explicitly null, even on a full page', async () => {
      const fetchPage = jest.fn(async () => ({
         items: ['a', 'b'],
         next: null,
      }));

      const result = await fetchAllPages({ fetchPage, perPage: 2 });

      expect(result).toEqual(['a', 'b']);
      expect(fetchPage).toHaveBeenCalledTimes(1);
   });

   it('follows next even when a page is shorter than the page size', async () => {
      const fetchPage = jest.fn(async ({ page }: { page: number }) => ({
         items: page === 1 ? ['a'] : ['b'],
         next: page === 1 ? '/next-page' : null,
      }));

      const result = await fetchAllPages({ fetchPage, perPage: 5 });

      expect(result).toEqual(['a', 'b']);
      expect(fetchPage).toHaveBeenCalledTimes(2);
   });

   it('refuses to truncate at the page cap', async () => {
      const fetchPage = jest.fn(async () => ({ items: ['item'] }));

      await expect(fetchAllPages({ fetchPage, perPage: 1, maxPages: 3, label: 'function' })).rejects.toThrow(
         /function.*3 pages/
      );
      expect(fetchPage).toHaveBeenCalledTimes(3);
   });

   it('propagates a rejected page and does not request later pages', async () => {
      const fetchPage = jest.fn(async ({ page }: { page: number }) => {
         if (page === 2) throw new Error('page failed');
         return { items: ['a', 'b'] };
      });

      await expect(fetchAllPages({ fetchPage, perPage: 2 })).rejects.toThrow('page failed');
      expect(fetchPage.mock.calls.map(([request]) => request.page)).toEqual([1, 2]);
   });
});
