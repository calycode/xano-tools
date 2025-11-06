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
 * Remove leading "/src/" or "src/" from a URL or path, if present.
 */
function removeLeadingSrc(url: string): string {
   return url.replace(/^\/?src\//, '/');
}

/**
 * Fix links in markdown content:
 * - Normalizes dynamic segments in the URL.
 * - Removes leading "src/" or "/src/" from the URL.
 * - Adjusts links to README.md and directories for Docsify.
 */
function fixMarkdownLinks(content: string, allPaths: string[]): string {
   return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      let cleanUrl = url.replace(/\\/g, '/');
      cleanUrl = removeLeadingSrc(cleanUrl);
      cleanUrl = normalizeDynamicSegments(cleanUrl);

      // Handle links to README.md
      if (cleanUrl.endsWith('/README.md')) {
         cleanUrl = cleanUrl.replace(/README\.md$/, '');
         if (!cleanUrl.endsWith('/')) cleanUrl += '/';
      } else if (
         allPaths.includes(joinPath(cleanUrl, 'README.md')) ||
         allPaths.includes(cleanUrl + '/README.md')
      ) {
         // If it's a folder, ensure trailing slash
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
      content: fixDynamicLinksInMarkdown(fixMarkdownLinks(item.content, allPaths)),
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
