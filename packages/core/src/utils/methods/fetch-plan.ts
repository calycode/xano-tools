/**
 * Fetch planning primitives for metadata endpoints.
 *
 * `mapConcurrent` runs independent async work with a hard concurrency ceiling and
 * returns results in input order. `fetchAllPages` walks a paginated endpoint until
 * the response is exhausted and refuses to truncate silently.
 *
 * Failure policy: fail-fast. The first rejected task stops new tasks from being
 * scheduled and rejects the run. Requests already in flight cannot be cancelled
 * because no AbortSignal is threaded through the metadata client; their results
 * are discarded.
 */

/** Default number of requests in flight for independent fetches. */
const DEFAULT_CONCURRENCY = 4;

/** Default page size used by the Xano metadata list endpoints. */
const DEFAULT_PAGE_SIZE = 500;

/** Safety cap: 100 pages at 500 items each. Exceeding it throws instead of truncating. */
const DEFAULT_MAX_PAGES = 100;

interface MapConcurrentOptions {
   /** Maximum number of mappers running at once. Defaults to 4, minimum 1. */
   concurrency?: number;
}

interface PageRequest {
   page: number;
   perPage: number;
}

interface PageResponse<T> {
   items?: T[] | null;
   total?: number | null;
   next?: unknown;
}

interface FetchAllPagesOptions<T> {
   /** Fetches one page. Injected so callers and tests control the transport. */
   fetchPage: (request: PageRequest) => Promise<PageResponse<T>>;
   /** Page size sent to the endpoint. Defaults to 500. */
   perPage?: number;
   /** Page cap before failing. Defaults to 100. */
   maxPages?: number;
   /** Label used in the cap error, e.g. the entity name. */
   label?: string;
}

function resolveConcurrency(concurrency: number | undefined, count: number): number {
   const requested = concurrency ?? DEFAULT_CONCURRENCY;
   const clamped = Number.isFinite(requested) ? Math.floor(requested) : DEFAULT_CONCURRENCY;
   return Math.min(Math.max(clamped, 1), count);
}

/**
 * Maps items through an async mapper with a bounded number of concurrent calls.
 * Results keep the input order regardless of completion order. The first rejection
 * aborts the run (fail-fast); no new items are scheduled after it.
 *
 * @param items - Input items; never mutated.
 * @param mapper - Async work for one item; receives the item and its index.
 * @param options.concurrency - Maximum concurrent mappers (default 4).
 * @returns Results in the same order as `items`.
 */
async function mapConcurrent<T, R>(
   items: readonly T[],
   mapper: (item: T, index: number) => Promise<R>,
   options: MapConcurrentOptions = {}
): Promise<R[]> {
   if (items.length === 0) return [];

   const concurrency = resolveConcurrency(options.concurrency, items.length);
   const results = new Array<R>(items.length);
   let nextIndex = 0;
   let failed = false;

   const worker = async (): Promise<void> => {
      while (!failed) {
         const index = nextIndex++;
         if (index >= items.length) return;

         try {
            results[index] = await mapper(items[index], index);
         } catch (err) {
            failed = true;
            throw err;
         }
      }
   };

   await Promise.all(Array.from({ length: concurrency }, () => worker()));
   return results;
}

/**
 * Fetches every page of a list endpoint and concatenates items in page order.
 *
 * Exhaustion is detected from, in order: an empty page, a `next` field (continue
 * while it is present and not null), a numeric `total`, or a short final page.
 * Hitting `maxPages` throws rather than returning a truncated list.
 */
async function fetchAllPages<T>({
   fetchPage,
   perPage = DEFAULT_PAGE_SIZE,
   maxPages = DEFAULT_MAX_PAGES,
   label = 'paginated request',
}: FetchAllPagesOptions<T>): Promise<T[]> {
   if (!Number.isInteger(perPage) || perPage < 1) {
      throw new Error(`Invalid page size for ${label}: ${perPage}`);
   }

   const collected: T[] = [];

   for (let page = 1; ; page++) {
      if (page > maxPages) {
         throw new Error(
            `Pagination for ${label} exceeded ${maxPages} pages; refusing to return a truncated result`
         );
      }

      const response = await fetchPage({ page, perPage });
      const pageItems = response.items ?? [];
      collected.push(...pageItems);

      if (pageItems.length === 0) return collected;

      if (response.next !== undefined) {
         if (response.next !== null) continue;
         return collected;
      }

      if (typeof response.total === 'number') {
         if (collected.length >= response.total) return collected;
         continue;
      }

      if (pageItems.length < perPage) return collected;
   }
}

export { DEFAULT_CONCURRENCY, DEFAULT_MAX_PAGES, DEFAULT_PAGE_SIZE, fetchAllPages, mapConcurrent };
export type { FetchAllPagesOptions, MapConcurrentOptions, PageRequest, PageResponse };
