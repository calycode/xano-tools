import { build } from 'esbuild';
import { renderRichHtml } from '@calycode/content-kit/html/rich';
import {
   cpSync,
   existsSync,
   mkdirSync,
   readFileSync,
   readdirSync,
   rmSync,
   statSync,
   writeFileSync,
} from 'fs';
import { createRequire } from 'module';
import path from 'path';

/**
 * Pre-render the docsify markdown in `docs/` into a static, server-visible site in `dist/`.
 *
 * The markdown that `generate-caly-cli-docs.ts` writes stays the source of truth for the legacy
 * docsify deployment; this script consumes the same files (plus `manifest.json`) and emits
 * complete HTML documents, so a crawler with JavaScript disabled sees the whole page. This is
 * strictly additive — the docsify output is untouched.
 */

const require = createRequire(import.meta.url);

const DOCS_DIR = 'docs';
const DIST_DIR = 'dist';
const TEMPLATE_DIR = 'util-resources/static-docs-template';
const ASSET_PREFIX = ''; // docs are absolute-root paths; only used inside template expressions
const MANIFEST_VERSION_FALLBACK = 'dev';
const MAX_INDEX_TEXT = 8000;

interface ManifestEntry {
   section: string;
   path: string;
   title: string;
   group: string | null;
   parent: string | null;
   order: number;
   source: string;
   segments: string[];
   file: string;
}

interface ManifestLink {
   section: string;
   title: string;
   href: string;
}

interface Manifest {
   version: number;
   generatedAt: string;
   entries: ManifestEntry[];
   links: ManifestLink[];
}

interface Asset {
   type: 'style' | 'script' | 'inline-script';
   key: string;
   href?: string;
   src?: string;
   code?: string;
   defer?: boolean;
   async?: boolean;
}

interface TreeNode {
   label: string;
   path: string | null;
   children: Map<string, TreeNode>;
}

/* ── Filesystem helpers ───────────────────────────────── */

function walkFiles(dir: string): string[] {
   return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? walkFiles(full) : [full];
   });
}

function writeRelative(base: string, rel: string, content: string): void {
   const target = path.join(base, rel);
   mkdirSync(path.dirname(target), { recursive: true });
   writeFileSync(target, content);
}

function writeBuffer(base: string, rel: string, content: Buffer): void {
   const target = path.join(base, rel);
   mkdirSync(path.dirname(target), { recursive: true });
   writeFileSync(target, content);
}

/* ── Markdown → HTML ──────────────────────────────────── */

/**
 * Turn one page's markdown into the content-kit rich HTML plus its asset list.
 *
 * `renderRichHtml` wraps its output in `<article>`. rich.css and the theme toggle both key off
 * `.ck-article`, so the class is added to that wrapper here — without it the terminal chrome,
 * code headers and alert surfaces have no styles at all.
 */
function renderArticle(markdown: string): { html: string; assets: Asset[] } {
   const result = renderRichHtml(markdown, {
      stylesheetHref: '/assets/rich.css',
      enhanceSrc: '/assets/rich-enhance.js',
   });
   const html = result.html.replace(/^<article>/, '<article class="ck-article">');
   return { html, assets: result.assets as Asset[] };
}

/* ── Legacy syntax normalization ──────────────────────── */

const CALLOUT_START = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i;
const BLOCKQUOTE_LINE = /^>\s?(.*)$/;

/**
 * The docs are authored for content-kit, but some pages still carry the GitHub/docsify callout
 * syntax (`> [!NOTE]`) that Markdoc renders as a literal blockquote. Rewrite those blocks into the
 * `{% alert %}` tag the renderer understands, so both the static site and the docsify deployment
 * show a real alert. Normal, top-level blockquotes are left untouched.
 */
function normalizeAlertCallouts(markdown: string): string {
   const lines = markdown.split(/\r?\n/);
   const out: string[] = [];
   for (let i = 0; i < lines.length; i++) {
      const match = CALLOUT_START.exec(lines[i]);
      if (!match) {
         out.push(lines[i]);
         continue;
      }
      // A malformed marker like `> [!NOTE] > **Notes:**` leaves a stray `>` on the same line.
      const first = match[2].trim().replace(/^>\s*/, '');
      const body: string[] = first ? [first] : [];
      while (i + 1 < lines.length && BLOCKQUOTE_LINE.test(lines[i + 1])) {
         body.push(BLOCKQUOTE_LINE.exec(lines[i + 1])![1]);
         i++;
      }
      out.push(`{% alert type="${match[1].toLowerCase()}" %}`, ...body, '{% /alert %}');
   }
   return out.join('\n');
}

/**
 * content-kit's Markdoc schema escapes raw HTML, so an authored `<details>` block arrives as
 * `&lt;details&gt;` text wrapped in a paragraph. Restore those specific tags (docs content is
 * trusted) and let the browser build the disclosure widget; only details/summary are touched.
 */
function restoreDetails(html: string): string {
   return html
      .replace(
         /<p>\s*&lt;details&gt;\s*&lt;summary&gt;([\s\S]*?)&lt;\/summary&gt;\s*<\/p>/gi,
         '<details class="md-details"><summary>$1</summary>'
      )
      .replace(/<p>\s*&lt;\/details&gt;\s*<\/p>/gi, '</details>')
      .replace(/&lt;details&gt;/gi, '<details class="md-details">')
      .replace(/&lt;summary&gt;([\s\S]*?)&lt;\/summary&gt;/gi, '<summary>$1</summary>')
      .replace(/&lt;\/details&gt;/gi, '</details>');
}

function renderAssets(assets: Asset[], position: 'head' | 'body'): string {
   return assets
      .filter((asset) =>
         position === 'head' ? asset.type === 'style' : asset.type !== 'style'
      )
      .map((asset) => {
         if (asset.type === 'style') return `<link rel="stylesheet" href="${asset.href}" />`;
         if (asset.type === 'script') {
            const attrs = asset.defer ? ' defer' : asset.async ? ' async' : '';
            return `<script src="${asset.src}"${attrs}></script>`;
         }
         return `<script>${asset.code}</script>`;
      })
      .join('\n');
}

/**
 * Rewrite relative markdown links to their rendered HTML pages so the static site has no
 * dead `.md` hrefs in navigation. Absolute URLs and pure fragments are left alone.
 */
function resolveHref(href: string): string {
   // Remember whether the author already rooted the link under /docs/ — the pages live there, so
   // it has to be put back after normalizing.
   const hadDocsPrefix = /^\/docs\//.test(href);
   let next = href;
   next = next.replace(/^\/docs\//, '/');
   next = next.replace(/^\.\//, '');
   const [pathPart, hash = ''] = next.split('#');
   if (!pathPart) return `#${hash}`;
   let resolved = pathPart;
   if (/\.md$/.test(resolved)) {
      resolved = resolved.replace(/\.md$/, '.html');
   } else if (resolved === 'README') {
      resolved = 'index.html';
   } else if (resolved.endsWith('/')) {
      resolved += 'index.html';
   }
   if (!resolved.startsWith('/')) resolved = '/' + resolved;
   if (resolved === '/xano.html') {
      resolved = '/docs/xano.html';
   } else if (hadDocsPrefix) {
      resolved = '/docs' + resolved;
   }
   return `${resolved}${hash ? '#' + hash : ''}`;
}

/**
 * Rewrite relative markdown links to their rendered HTML pages so the static site has no dead
 * `.md` hrefs in navigation. Absolute URLs and pure fragments are left alone. The enhancer's
 * `data-preview-link` hint is rewritten the same way; external links keep their real `.md`.
 */
function rewriteLinks(html: string): string {
   return html
      .replace(/title="undefined"/g, '')
      .replace(/href="([^"]+)"/g, (match, href: string) => {
         if (/^(https?:|mailto:|tel:|#|\/\/)/.test(href)) return match;
         return `href="${resolveHref(href)}"`;
      })
      .replace(/data-preview-link="([^"]+)"/g, (match, href: string) => {
         if (/^(https?:|mailto:|tel:|#|\/\/)/.test(href)) return match;
         return `data-preview-link="${resolveHref(href)}"`;
      });
}

/** `content-kit` escapes prose but passes raw HTML through, so markdown bodies may contain limbs. */
function extractHeadings(html: string): string[] {
   const headings: string[] = [];
   const regex = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi;
   let match: RegExpExecArray | null;
   while ((match = regex.exec(html))) {
      const text = stripTags(match[1]).trim();
      if (text) headings.push(text);
   }
   return headings;
}

function stripTags(html: string): string {
   return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
}

function normalizeText(html: string): string {
   return stripTags(html).replace(/\s+/g, ' ').trim();
}

/* ── Sidebar tree ─────────────────────────────────────── */

function buildTree(entries: ManifestEntry[]): TreeNode {
   const root: TreeNode = { label: '', path: null, children: new Map() };
   entries.forEach((entry) => {
      let node = root;
      entry.segments.forEach((segment, i) => {
         if (!node.children.has(segment)) {
            node.children.set(segment, { label: segment, path: null, children: new Map() });
         }
         node = node.children.get(segment)!;
         if (i === entry.segments.length - 1) node.path = entry.path;
      });
      if (entry.segments.length === 0) node.path = entry.path;
   });
   return root;
}

function sidebarHref(entryPath: string): string {
   if (entryPath === '' || entryPath.endsWith('/')) return `/docs/${entryPath}index.html`;
   return `/docs/${entryPath}.html`;
}

function isActive(entryPath: string, currentPath: string): boolean {
   return entryPath === currentPath;
}

function renderTree(node: TreeNode, currentPath: string, depth = 0): string {
   const items = [...node.children.entries()].map(([key, child]) => {
      const hasChildren = child.children.size > 0;
      const label = escapeHtml(child.label);
      const active = child.path !== null && isActive(child.path, currentPath);
      const activeClass = active ? ' is-active' : '';

      if (!hasChildren) {
         // Leaves reserve the same toggle gutter as groups so every label lines up on one axis.
         return child.path !== null
            ? `<li class="d-nav__item" data-depth="${depth}"><div class="d-nav__row"><span class="d-nav__spacer" aria-hidden="true"></span><a class="d-nav__link${activeClass}" href="${sidebarHref(
                 child.path
              )}">${label}</a></div></li>`
            : '';
      }

      // A group whose own command has a page is both a link and a disclosure. The chevron owns
      // expansion; the label navigates. Top-level groups (and any ancestor of the current page)
      // start open, so the tree opens where the reader is.
      const containsActive = subtreeContains(child, currentPath);
      const isOpen = containsActive || depth === 0;
      const open = isOpen ? ' is-open' : '';
      const ownLink =
         child.path !== null
            ? `<a class="d-nav__link d-nav__link--group${activeClass}" href="${sidebarHref(
                 child.path
              )}">${label}</a>`
            : `<span class="d-nav__link d-nav__link--group d-nav__label">${label}</span>`;
      return `<li class="d-nav__group${open}" data-depth="${depth}" aria-expanded="${
         isOpen ? 'true' : 'false'
      }"><div class="d-nav__row"><button class="d-nav__toggle" type="button" aria-label="Toggle ${label}"></button>${ownLink}</div><ul class="d-nav__children">${renderTree(
         child,
         currentPath,
         depth + 1
      )}</ul></li>`;
   });
   return items.join('');
}

function subtreeContains(node: TreeNode, currentPath: string): boolean {
   if (node.path !== null && isActive(node.path, currentPath)) return true;
   return [...node.children.values()].some((child) => subtreeContains(child, currentPath));
}

function renderSidebar(manifest: Manifest, currentPath: string): string {
   const sections = new Map<string, ManifestEntry[]>();
   manifest.entries.forEach((entry) => {
      if (!sections.has(entry.section)) sections.set(entry.section, []);
      sections.get(entry.section)!.push(entry);
   });
   sections.forEach((list) => list.sort((a, b) => a.order - b.order));

   const parts: string[] = [
      '<div class="d-search">' +
         '<input id="d-search-input" class="d-search__input" type="search" placeholder="Search docs…  (/)" ' +
         'aria-label="Search documentation" autocomplete="off" />' +
         '<div id="d-search-results" class="d-search__results" role="listbox" hidden></div>' +
         '</div>',
   ];

   sections.forEach((entries, section) => {
      parts.push(`<div class="d-nav__section">${escapeHtml(section)}</div>`);
      if (section === 'Commands' || section === 'Guides') {
         const tree = buildTree(entries);
         parts.push(`<ul class="d-nav">${renderTree(tree, currentPath)}</ul>`);
      } else {
         const items = entries
            .map((entry) => {
               const active = isActive(entry.path, currentPath) ? ' class="is-active"' : '';
               return `<li><a href="${sidebarHref(entry.path)}"${active}>${escapeHtml(
                  entry.title
               )}</a></li>`;
            })
            .join('');
         parts.push(`<ul class="d-nav">${items}</ul>`);
      }
   });

   const linkSections = new Map<string, ManifestLink[]>();
   manifest.links.forEach((link) => {
      if (!linkSections.has(link.section)) linkSections.set(link.section, []);
      linkSections.get(link.section)!.push(link);
   });
   linkSections.forEach((links, section) => {
      parts.push(`<div class="d-nav__section">${escapeHtml(section)}</div>`);
      parts.push(
         `<ul class="d-nav">${links
            .map(
               (link) =>
                  `<li><a href="${link.href}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                     link.title
                  )}</a></li>`
            )
            .join('')}</ul>`
      );
   });

   return parts.join('\n');
}

function escapeHtml(value: string): string {
   return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
}

function metaDescription(entry: ManifestEntry, html: string): string {
   const text = normalizeText(html);
   const words = text.split(' ').slice(0, 28).join(' ');
   return escapeHtml(`${entry.title} — ${words}`.slice(0, 300));
}

/* ── Pager ────────────────────────────────────────────── */

function renderPager(entries: ManifestEntry[], currentPath: string): { prev: string; next: string } {
   const idx = entries.findIndex((entry) => entry.path === currentPath);
   const prev = idx > 0 ? entries[idx - 1] : null;
   const next = idx >= 0 && idx < entries.length - 1 ? entries[idx + 1] : null;
   const link = (target: ManifestEntry | null, dir: 'prev' | 'next') =>
      target
         ? `<a class="d-pager__link d-pager__link--${dir}" href="${sidebarHref(target.path)}"><span class="d-pager__dir">${dir === 'prev' ? 'Previous' : 'Next'}</span><span class="d-pager__title">${escapeHtml(
              target.title
           )}</span></a>`
         : '';
   return { prev: link(prev, 'prev'), next: link(next, 'next') };
}

/* ── Shell assembly ───────────────────────────────────── */

function fill(template: string, values: Record<string, string>): string {
   return template.replace(/%%([A-Z_]+)%%/g, (match, key: string) => values[key] ?? match);
}

function canonicalUrl(entryPath: string): string {
   if (entryPath === '' || entryPath.endsWith('/')) return `https://cli.calycode.com/docs/${entryPath}`;
   return `https://cli.calycode.com/docs/${entryPath}.html`;
}

/* ── Main ─────────────────────────────────────────────── */

async function main(): Promise<void> {
   console.log('Building static docs site\n');

   const manifestPath = path.join(DOCS_DIR, 'manifest.json');
   if (!existsSync(manifestPath)) {
      throw new Error(`${manifestPath} is missing — run "pnpm build:docs" first.`);
   }
   const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest;
   const manifestVersion =
      String(manifest.generatedAt ?? MANIFEST_VERSION_FALLBACK) || MANIFEST_VERSION_FALLBACK;

   const shell = readFileSync(path.join(TEMPLATE_DIR, 'shell.html'), 'utf-8');
   const landing = readFileSync(path.join(TEMPLATE_DIR, 'landing.html'), 'utf-8');

   rmSync(DIST_DIR, { recursive: true, force: true });
   mkdirSync(DIST_DIR, { recursive: true });

   // 1. Static assets.
   const ckAssets = path.join(path.dirname(require.resolve('@calycode/content-kit/package.json')), 'assets');
   writeBuffer(DIST_DIR, 'assets/rich.css', readFileSync(path.join(ckAssets, 'rich.css')));
   writeBuffer(
      DIST_DIR,
      'assets/rich-enhance.js',
      readFileSync(path.join(ckAssets, 'rich-enhance.js'))
   );
   writeBuffer(DIST_DIR, 'assets/docs.css', readFileSync(path.join(TEMPLATE_DIR, 'docs.css')));
   writeBuffer(
      DIST_DIR,
      'assets/logo.png',
      readFileSync(path.join(DOCS_DIR, '_media', 'logo.png'))
   );
   console.log('Copied static assets.\n');

   // 2. Bundle the client (theme, sidebar, MiniSearch).
   const clientResult = await build({
      entryPoints: ['scripts/client/static-docs.ts'],
      bundle: true,
      minify: true,
      format: 'iife',
      target: ['es2020'],
      write: false,
      logLevel: 'warning',
   });
    writeBuffer(DIST_DIR, 'assets/docs.js', Buffer.from(clientResult.outputFiles[0].text));
    console.log('Bundled docs.js.\n');

    // 2b. Agentation feedback toolbar. The loader is tiny and always shipped; it only fetches the
    // React + Agentation bundle below on loopback hosts, so production visitors download neither.
    const agentationLoader = await build({
       entryPoints: ['scripts/client/agentation-loader.ts'],
       bundle: true,
       minify: true,
       format: 'iife',
       target: ['es2020'],
       write: false,
       logLevel: 'warning',
    });
    writeBuffer(
       DIST_DIR,
       'assets/agentation.js',
       Buffer.from(agentationLoader.outputFiles[0].text)
    );

    const agentationApp = await build({
       entryPoints: ['scripts/client/agentation-app.ts'],
       bundle: true,
       minify: true,
       format: 'iife',
       target: ['es2020'],
       define: { 'process.env.NODE_ENV': '"production"' },
       write: false,
       logLevel: 'warning',
    });
    writeBuffer(
       DIST_DIR,
       'assets/agentation-app.js',
       Buffer.from(agentationApp.outputFiles[0].text)
    );
    console.log('Bundled agentation.js + agentation-app.js.\n');

   // 3. Render every entry to a complete HTML document, mirror the .md, collect search records.
   const searchRecords: Array<Record<string, unknown>> = [];

   const writePage = (
      entry: ManifestEntry,
      outRel: string,
      markdown: string,
      mdHref: string
   ) => {
      const normalized = normalizeAlertCallouts(markdown);
      const { html, assets } = renderArticle(normalized);
      const body = restoreDetails(rewriteLinks(html));

      const values: Record<string, string> = {
         MANIFEST_VERSION: manifestVersion,
         TITLE: escapeHtml(entry.title),
         DESCRIPTION: metaDescription(entry, body),
         CANONICAL: canonicalUrl(entry.path),
         MD_HREF: mdHref,
         ASSET_PREFIX: ASSET_PREFIX,
         HOME_HREF: '/docs/',
         CURRENT_PATH: entry.path,
         SIDEBAR: renderSidebar(manifest, entry.path),
         CONTENT: body,
         HEAD_ASSETS: renderAssets(assets, 'head'),
         BODY_ASSETS: renderAssets(assets, 'body'),
         PREV: '',
         NEXT: '',
      };
      const pager = renderPager(manifest.entries, entry.path);
      values.PREV = pager.prev;
      values.NEXT = pager.next;
      writeRelative(DIST_DIR, outRel, fill(shell, values));

      // Agent/SEO mirror: normalized markdown next to the HTML.
      writeRelative(DIST_DIR, mdHref.replace(/^\//, ''), normalized);

      searchRecords.push({
         path: entry.path,
         url: sidebarHref(entry.path),
         title: entry.title,
         section: entry.section,
         group: entry.group,
         headings: extractHeadings(body),
         text: normalizeText(body).slice(0, MAX_INDEX_TEXT),
      });
   };

   manifest.entries.forEach((entry) => {
      const sourcePath = path.join(DOCS_DIR, entry.file);
      const markdown = readFileSync(sourcePath, 'utf-8');

      let outRel: string;
      let mdHref: string;
      if (entry.source === 'overview') {
         outRel = 'docs/index.html';
         mdHref = '/docs/index.md';
      } else if (entry.source === 'generated' && entry.path === 'xano') {
         outRel = 'docs/xano.html';
         mdHref = '/docs/xano.md';
      } else {
         outRel = `docs/${entry.path}.html`;
         mdHref = `/docs/${entry.path}.md`;
      }
      writePage(entry, outRel, markdown, mdHref);
   });

   // Root redirect so cli.calycode.com lands on the docs home.
   writeRelative(
      DIST_DIR,
      'docs.html',
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>@calycode/cli Docs</title>` +
         `<meta http-equiv="refresh" content="0; url=/docs/"><link rel="canonical" href="https://cli.calycode.com/docs/">` +
         `<meta name="robots" content="noindex"></head><body><a href="/docs/">@calycode/cli Docs</a></body></html>`
   );

   // 4. Search index + manifest copy.
   writeRelative(
      DIST_DIR,
      'assets/search-index.json',
      JSON.stringify(searchRecords)
   );
   writeRelative(DIST_DIR, 'manifest.json', JSON.stringify(manifest, null, 2) + '\n');
   console.log(`Rendered ${searchRecords.length} pages + search index.\n`);

   // 5. Landing page.
   const cliPkg = JSON.parse(
      readFileSync(path.join('packages', 'cli', 'package.json'), 'utf-8')
   ) as { version: string };
   writeRelative(
      DIST_DIR,
      'index.html',
      fill(landing, {
         MANIFEST_VERSION: manifestVersion,
         ASSET_PREFIX: ASSET_PREFIX,
         VERSION: cliPkg.version,
         INSTALL_CMD: 'npm i -g @calycode/cli',
         GENERATED_AT: new Date(manifest.generatedAt).toISOString().slice(0, 10),
      })
   );
   console.log('Built landing page.\n');

   // 6. Sitemap.
   writeRelative(
      DIST_DIR,
      'sitemap.xml',
      renderSitemap(manifest.entries)
   );

   // 7. Keep .nojekyll (harmless on GCS, needed elsewhere).
   writeRelative(DIST_DIR, '.nojekyll', '');

   console.log(`Static docs built into ${DIST_DIR}/.\n`);
}

function renderSitemap(entries: ManifestEntry[]): string {
   const urls = [
      { loc: 'https://cli.calycode.com/', priority: '1.0' },
      ...entries.map((entry) => ({
         loc: canonicalUrl(entry.path),
         priority: entry.section === 'Commands' ? '0.7' : '0.8',
      })),
   ];
   return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `   <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`)
      .join('\n')}\n</urlset>\n`;
}

main().catch((error) => {
   console.error('Error building static docs:', error);
   process.exit(1);
});
