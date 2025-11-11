import { generateRepoImplementation } from './generate-repo';
import type { Caly } from '..';
import { joinPath } from '@repo/utils';
import {
   INTERNAL_DOCS_ASSETS,
   generateAllFolderReadmes,
   generateSidebar,
   generateWelcomeReadme,
} from '../features/internal-docs';

/**
 * Replace all curly-brace dynamic segments like {slug} with _slug_ in a path or content.
 * Does NOT affect slashes.
 */
function normalizeDynamicSegments(str: string): string {
   return str.replace(/{([^/}]+)}/g, '-$1-');
}

/**
 * Remove a leading "src/" or "/src/" prefix from a path, replacing it with a single leading slash.
 *
 * @param url - The path or URL to normalize
 * @returns The path with a leading `src/` or `/src/` replaced by `/`, or the original `url` if no such prefix exists
 */
function removeLeadingSrc(url: string): string {
   return url.replace(/^\/?src\//, '/');
}

/**
 * Compute the parent directory of a forward-slash-delimited path.
 *
 * @param path - The input path (file or directory) using `/` as segment separator; may include a trailing slash
 * @returns The parent path with no trailing slash; returns an empty string if the input has no parent (single-segment or root)
 */
function getParentDir(path: string): string {
   // Remove trailing slash if present
   path = path.replace(/\/$/, '');
   // Remove last segment (file or directory)
   const parts = path.split('/');
   parts.pop();
   return parts.join('/');
}

/**
 * Rewrite Markdown links so they resolve correctly for the generated docs.
 *
 * Rewrites link targets to remove leading `src/`, normalize dynamic segments like `{slug}`,
 * convert `README.md` targets into directory-style URLs, and resolve leading `./` links
 * relative to the parent directory of `current_path`.
 *
 * @param content - The markdown text containing links to fix
 * @param current_path - Path of the current markdown file used to resolve `./`-relative links
 * @param allPaths - List of normalized markdown file paths used to detect existing `README.md` targets
 * @returns The markdown text with updated link targets
 */
function fixMarkdownLinks(content: string, current_path: string, allPaths: string[]): string {
   const parentDir = getParentDir(current_path);

   return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      let cleanUrl = url.replace(/\\/g, '/');

      // Magic: Replace leading './' with parentDir if present
      if (cleanUrl.startsWith('./')) {
         cleanUrl = (parentDir ? parentDir + '/' : '') + cleanUrl.slice(2);
         // Remove possible double slashes
         cleanUrl = cleanUrl.replace(/\/{2,}/g, '/');
      }

      cleanUrl = removeLeadingSrc(cleanUrl);
      cleanUrl = normalizeDynamicSegments(cleanUrl);

      // Handle links to README.md
      if (cleanUrl.endsWith('/README.md')) {
         cleanUrl = cleanUrl.replace(/README\.md$/, '');
         if (cleanUrl === '') {
            cleanUrl = '/';
         } else if (!cleanUrl.endsWith('/')) {
            cleanUrl += '/';
         }
      } else if (
         allPaths.includes(joinPath(cleanUrl, 'README.md')) ||
         allPaths.includes(cleanUrl + '/README.md')
      ) {
         if (!cleanUrl.endsWith('/')) cleanUrl += '/';
      }

      // Remove double slashes except for protocol (e.g., http://)
      cleanUrl = cleanUrl.replace(/([^:]\/)\/+/g, '$1');
      return `[${text}](${cleanUrl})`;
   });
}

/**
 * Also normalizes dynamic segments in the whole markdown content (for in-body references).
 */
function fixDynamicLinksInMarkdown(content: string): string {
   return normalizeDynamicSegments(content);
}

/**
 * Builds a set of internal documentation files from repository JSON and storage inputs.
 *
 * Processes repository items into normalized markdown files with fixed links, generates folder-level README files, and adds core documentation files (index.html, README.md, _sidebar.md).
 *
 * @param jsonData - Repository metadata or manifest used to produce repository items
 * @param storage - Storage adapter or client used to read repository file contents
 * @param core - Caly core instance used by the repository generation step
 * @param instance - Optional instance identifier to scope the repository generation
 * @param workspace - Optional workspace identifier to scope the repository generation
 * @param branch - Optional branch name to scope the repository generation
 * @returns An array of objects each containing `path` and `content` for generated documentation files (processed markdown, folder readmes, and core files)
 */
async function generateInternalDocsImplementation({
   jsonData,
   storage,
   core,
   instance,
   workspace,
   branch,
}: {
   jsonData: any;
   storage: any;
   core: Caly;
   instance?: string;
   workspace?: string;
   branch?: string;
}): Promise<{ path: string; content: string }[]> {
   const generatedRepoItems = await generateRepoImplementation({
      jsonData,
      storage,
      core,
      instance,
      workspace,
      branch,
   });

   // First, normalize all paths for folder/file references
   const markdownItems = generatedRepoItems
      .filter((item) => item.path.endsWith('.md'))
      .map((item) => ({
         ...item,
         path: normalizeDynamicSegments(item.path),
      }));
   const allPaths = markdownItems.map((item) => item.path);

   // Now process content with all link fixes
   const processedMarkdownItems = markdownItems.map((item) => ({
      ...item,
      content: fixDynamicLinksInMarkdown(fixMarkdownLinks(item.content, item.path, allPaths)),
   }));

   const generatedReadmes = generateAllFolderReadmes(allPaths);

   const coreFiles = [
      {
         path: 'index.html',
         content: INTERNAL_DOCS_ASSETS.html_template,
      },
      {
         path: 'README.md',
         content: generateWelcomeReadme(allPaths, INTERNAL_DOCS_ASSETS.welcome_readme),
      },
      {
         path: '_sidebar.md',
         content: generateSidebar(allPaths, INTERNAL_DOCS_ASSETS.sidebar),
      },
   ];

   return [...processedMarkdownItems, ...generatedReadmes, ...coreFiles];
}

export { generateInternalDocsImplementation };