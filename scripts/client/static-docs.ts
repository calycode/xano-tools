import MiniSearch from 'minisearch';

/**
 * Client runtime for the static CLI docs.
 *
 * Three jobs, all progressive enhancements over server-rendered HTML: the theme toggle, the
 * mobile sidebar, and search. The search index is fetched once, cached in IndexedDB keyed by the
 * manifest version, and queried with MiniSearch from any page. With JS disabled the pages still
 * render completely — only the toggle, sidebar and search go away.
 */

interface DocRecord {
   path: string;
   url: string;
   title: string;
   section: string;
   group: string | null;
   headings: string[];
   text: string;
}

const DB_NAME = 'calycode-docs';
const STORE = 'pages';
const META = 'meta';
const THEME_KEY = 'calycode-docs-theme';
const INDEX_URL = '/assets/search-index.json';

/* ── Theme ─────────────────────────────────────────── */

function applyTheme(theme: string): void {
   document.documentElement.dataset.theme = theme;
   document.querySelectorAll<HTMLElement>('.ck-article').forEach((el) => {
      el.classList.toggle('light', theme === 'light');
   });
   document.querySelectorAll<HTMLElement>('[data-theme-icon]').forEach((el) => {
      el.textContent = theme === 'light' ? '☀' : '☾';
   });
}

function initTheme(): void {
   let stored: string | null = null;
   try {
      stored = localStorage.getItem(THEME_KEY);
   } catch {
      stored = null;
   }
   applyTheme(stored === 'light' ? 'light' : 'dark');

   document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
         const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
         applyTheme(next);
         try {
            localStorage.setItem(THEME_KEY, next);
         } catch {
            /* storage unavailable — theme stays for the session only */
         }
      });
   });
}

/* ── Sidebar ───────────────────────────────────────── */

function initSidebar(): void {
   const body = document.body;
   const toggle = document.querySelector<HTMLElement>('[data-sidebar-toggle]');
   const scrim = document.querySelector<HTMLElement>('[data-sidebar-close]');

   const setOpen = (open: boolean) => {
      body.classList.toggle('sidebar-open', open);
      toggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (scrim) scrim.hidden = !open;
   };

   toggle?.addEventListener('click', () => setOpen(!body.classList.contains('sidebar-open')));
   scrim?.addEventListener('click', () => setOpen(false));
   window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
   });

   // Every group renders expanded so a no-JS reader sees the whole tree. Once JS is running,
   // collapse the groups that are not on the active path.
   document.querySelectorAll<HTMLElement>('.d-nav__group').forEach((group) => {
      const open = group.classList.contains('is-open');
      const children = group.querySelector<HTMLElement>('.d-nav__children');
      const button = group.querySelector<HTMLElement>('.d-nav__toggle');
      group.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (children && !open) children.hidden = true;
      button?.addEventListener('click', () => {
         const isOpen = group.getAttribute('aria-expanded') !== 'false';
         group.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
         if (children) children.hidden = isOpen;
      });
   });
}

/* ── IndexedDB helpers ─────────────────────────────── */

function openDb(): Promise<IDBDatabase | null> {
   return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      let request: IDBOpenDBRequest;
      try {
         request = indexedDB.open(DB_NAME, 1);
      } catch {
         return resolve(null);
      }
      request.onupgradeneeded = () => {
         const db = request.result;
         if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'path' });
         if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
   });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
   return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

async function readCached(db: IDBDatabase | null, version: string): Promise<DocRecord[] | null> {
   if (!db) return null;
   try {
      const tx = db.transaction([STORE, META], 'readonly');
      const meta = (await requestResult(tx.objectStore(META).get('index-version'))) as
         | { key: string; version: string }
         | undefined;
      if (!meta || meta.version !== version) return null;
      const records = (await requestResult(tx.objectStore(STORE).getAll())) as DocRecord[];
      return records.length ? records : null;
   } catch {
      return null;
   }
}

async function writeCache(db: IDBDatabase | null, version: string, records: DocRecord[]): Promise<void> {
   if (!db) return;
   try {
      const tx = db.transaction([STORE, META], 'readwrite');
      const store = tx.objectStore(STORE);
      store.clear();
      records.forEach((record) => store.put(record));
      tx.objectStore(META).put({ key: 'index-version', version });
   } catch {
      /* cache write failure is non-fatal — search still works from memory */
   }
}

async function loadRecords(): Promise<DocRecord[]> {
   const version = document.documentElement.dataset.manifestVersion ?? '';
   const db = await openDb();
   const cached = await readCached(db, version);
   if (cached) return cached;

   const records = (await fetch(INDEX_URL, { cache: 'no-cache' }).then((r) => r.json())) as DocRecord[];
   await writeCache(db, version, records);
   return records;
}

/* ── Search ────────────────────────────────────────── */

function escapeHtml(value: string): string {
   return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
}

function snippetFor(record: DocRecord, query: string): string {
   const needle = query.trim().toLowerCase();
   const text = record.text ?? '';
   const at = needle ? text.toLowerCase().indexOf(needle) : -1;
   if (at < 0) return text.slice(0, 150);
   const start = Math.max(0, at - 50);
   return (start > 0 ? '…' : '') + text.slice(start, start + 170);
}

async function initSearch(): Promise<void> {
   const input = document.querySelector<HTMLInputElement>('#d-search-input');
   const results = document.querySelector<HTMLElement>('#d-search-results');
   if (!input || !results) return;

   interface SearchRecord {
      id: string;
      path: string;
      url: string;
      title: string;
      section: string;
      headings: string;
      text: string;
   }
   let mini: MiniSearch<SearchRecord> | null = null;
   try {
      const records = await loadRecords();
      mini = new MiniSearch<SearchRecord>({
         idField: 'id',
         fields: ['title', 'headings', 'text'],
         storeFields: ['title', 'section', 'url', 'path'],
         searchOptions: { boost: { title: 3, headings: 2 }, prefix: true, fuzzy: 0.2 },
      });
      mini.addAll(
         records.map((r) => ({ ...r, id: r.path || 'index', headings: r.headings.join(' ') }))
      );
   } catch (error) {
      console.warn('[docs] search index unavailable', error);
   }

   let active = -1;
   let hits: Array<Record<string, unknown>> = [];

   const close = () => {
      results.hidden = true;
      active = -1;
   };

   const render = (query: string) => {
      if (!mini) {
         results.innerHTML = '<div class="d-search__empty">Search is unavailable offline.</div>';
         results.hidden = false;
         return;
      }
      if (!query.trim()) return close();
      hits = mini.search(query).slice(0, 10) as Array<Record<string, unknown>>;
      if (!hits.length) {
         results.innerHTML = '<div class="d-search__empty">No matches.</div>';
         results.hidden = false;
         return;
      }
      results.innerHTML = hits
         .map((hit, i) => {
            const title = escapeHtml(String(hit.title ?? hit.path ?? ''));
            const section = escapeHtml(String(hit.section ?? ''));
            const snippet = escapeHtml(snippetFor(hit as unknown as DocRecord, query));
            return `<a class="d-search__item" role="option" href="${escapeHtml(
               String(hit.url ?? '#')
            )}" data-index="${i}"><span class="d-search__item-section">${section}</span><span class="d-search__item-title">${title}</span><span class="d-search__item-snippet">${snippet}</span></a>`;
         })
         .join('');
      results.hidden = false;
      active = 0;
      highlight();
   };

   const highlight = () => {
      results.querySelectorAll<HTMLElement>('.d-search__item').forEach((el, i) => {
         el.setAttribute('aria-selected', i === active ? 'true' : 'false');
      });
   };

   let timer: number | undefined;
   input.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => render(input.value), 120);
   });

   input.addEventListener('keydown', (e) => {
      if (results.hidden || !hits.length) return;
      if (e.key === 'ArrowDown') {
         e.preventDefault();
         active = (active + 1) % hits.length;
         highlight();
      } else if (e.key === 'ArrowUp') {
         e.preventDefault();
         active = (active - 1 + hits.length) % hits.length;
         highlight();
      } else if (e.key === 'Enter') {
         const item = results.querySelectorAll<HTMLAnchorElement>('.d-search__item')[active];
         if (item) window.location.href = item.href;
      } else if (e.key === 'Escape') {
         close();
      }
   });

   document.addEventListener('click', (e) => {
      if (!results.contains(e.target as Node) && e.target !== input) close();
   });

   // `/` focuses search, the convention readers expect.
   window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== input && !/input|textarea/i.test((document.activeElement?.tagName ?? ''))) {
         e.preventDefault();
         input.focus();
      }
   });
}

/* ── Terminals ─────────────────────────────────────── */

function initTerminals(): void {
   // A ported command is a single line; replaying it is imperceptible and the button reads as
   // broken. Drop it unless there is an actual sequence to replay.
   document.querySelectorAll<HTMLElement>('.md-term-wrap').forEach((wrap) => {
      const replay = wrap.querySelector<HTMLElement>('.md-term-replay');
      const code = wrap.querySelector<HTMLElement>('pre code');
      if (!replay || !code) return;
      const lines = (code.textContent ?? '')
         .split('\n')
         .filter((line) => line.trim().length > 0);
      if (lines.length < 2) replay.remove();
   });
}

/* ── Landing install copy ──────────────────────────── */

function initLanding(): void {
   const button = document.querySelector<HTMLElement>('[data-copy-install]');
   const code = document.querySelector<HTMLElement>('.d-install code');
   if (!button || !code) return;
   button.addEventListener('click', async () => {
      try {
         await navigator.clipboard.writeText(code.textContent ?? '');
         button.textContent = 'copied';
         window.setTimeout(() => (button.textContent = 'copy'), 1500);
      } catch {
         /* clipboard denied — leave the label unchanged */
      }
   });
}

function boot(): void {
   initTheme();
   initSidebar();
   initTerminals();
   initLanding();
   void initSearch();
}

if (document.readyState === 'loading') {
   document.addEventListener('DOMContentLoaded', boot);
} else {
   boot();
}
