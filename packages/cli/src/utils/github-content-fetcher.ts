import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Validates that a resolved path stays within the expected base directory.
 * Prevents path traversal attacks from malicious file paths.
 * @param basePath - The base directory that paths must stay within
 * @param filePath - The relative file path to validate
 * @returns The validated full path
 * @throws {Error} if the path would escape the base directory
 */
function validatePathWithinBase(basePath: string, filePath: string): string {
   // Normalize both paths to handle different separators and . or .. components
   const resolvedBase = path.resolve(basePath);
   const fullPath = path.resolve(basePath, filePath);

   // Ensure the resolved path starts with the base path
   // Add path.sep to prevent matching partial directory names (e.g., /tmp/cache vs /tmp/cache-evil)
   if (!fullPath.startsWith(resolvedBase + path.sep) && fullPath !== resolvedBase) {
      throw new Error(
         `Path traversal detected: "${filePath}" resolves outside the allowed directory`,
      );
   }

   return fullPath;
}

/**
 * Options for fetching content from GitHub
 */
export interface FetchOptions {
   /** GitHub repository owner */
   owner: string;
   /** GitHub repository name */
   repo: string;
   /** Branch, tag, or commit (default: 'main') */
   ref?: string;
   /** Subdirectory path within the repo */
   subpath: string;
   /** Local cache directory (default: ~/.calycode/cache/templates) */
   cacheDir?: string;
   /** Use cache if available (default: true) */
   preferOffline?: boolean;
   /** Force re-fetch even if cache exists */
   force?: boolean;
   /** GitHub token for private repos (optional) */
   authToken?: string;
}

/**
 * Result of a fetch operation
 */
export interface FetchedContent {
   /** Map of relative file paths to their content */
   files: Map<string, string>;
   /** Whether content was loaded from cache */
   fromCache: boolean;
   /** Age of cache in milliseconds (if from cache) */
   cacheAge?: number;
}

/**
 * Cache metadata stored alongside cached files
 */
interface CacheMetadata {
   timestamp: number;
   ref: string;
   files: string[];
}

/**
 * GitHub API response for directory contents
 */
interface GitHubContentItem {
   name: string;
   path: string;
   type: 'file' | 'dir';
   download_url: string | null;
}

/**
 * Fetches content from GitHub repositories with local caching support.
 *
 * Features:
 * - Fetches directories recursively from GitHub
 * - Caches content locally for offline use
 * - Supports prefer-offline mode (cache first, then network)
 * - Falls back to cache on network errors
 *
 * @example
 * ```typescript
 * const fetcher = new GitHubContentFetcher();
 *
 * const { files, fromCache } = await fetcher.fetchDirectory({
 *   owner: 'calycode',
 *   repo: 'xano-tools',
 *   subpath: 'packages/opencode-templates',
 *   preferOffline: true,
 * });
 *
 * for (const [filePath, content] of files) {
 *   console.log(`${filePath}: ${content.length} bytes`);
 * }
 * ```
 */
export class GitHubContentFetcher {
   private defaultCacheDir: string;
   private static readonly CACHE_META_FILE = 'cache-meta.json';
   private static readonly USER_AGENT = '@calycode/cli';

   constructor() {
      this.defaultCacheDir = path.join(os.homedir(), '.calycode', 'cache', 'templates');
   }

   /**
    * Fetch a directory of files from GitHub.
    * Uses cache based on preferOffline setting, falls back to cache on network errors.
    */
   async fetchDirectory(options: FetchOptions): Promise<FetchedContent> {
      const {
         owner,
         repo,
         ref = 'main',
         subpath,
         preferOffline = true,
         force = false,
         authToken,
      } = options;

      const cacheDir = options.cacheDir || this.defaultCacheDir;
      const cacheSubDir = path.join(cacheDir, `${owner}-${repo}`, subpath.replace(/\//g, '-'));

      // Check cache first if preferOffline and not forcing refresh
      if (preferOffline && !force) {
         const cached = await this.loadFromCache(cacheSubDir);
         if (cached) {
            return { files: cached.files, fromCache: true, cacheAge: cached.age };
         }
      }

      // Try to fetch from GitHub
      try {
         const files = await this.fetchFromGitHub(owner, repo, ref, subpath, authToken);
         await this.saveToCache(cacheSubDir, files, ref);
         return { files, fromCache: false };
      } catch (error) {
         // Fallback to cache on network error
         const cached = await this.loadFromCache(cacheSubDir);
         if (cached) {
            const ageMinutes = Math.round(cached.age / 1000 / 60);
            console.warn(`Network error, using cached templates (${ageMinutes} minutes old)`);
            return { files: cached.files, fromCache: true, cacheAge: cached.age };
         }

         // No cache available, re-throw the error
         throw error;
      }
   }

   /**
    * Fetch directory contents from GitHub API recursively
    */
   private async fetchFromGitHub(
      owner: string,
      repo: string,
      ref: string,
      subpath: string,
      authToken?: string,
   ): Promise<Map<string, string>> {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${subpath}?ref=${ref}`;

      const headers: Record<string, string> = {
         Accept: 'application/vnd.github+json',
         'User-Agent': GitHubContentFetcher.USER_AGENT,
         'X-GitHub-Api-Version': '2022-11-28',
      };

      if (authToken) {
         headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(apiUrl, { headers });

      if (!response.ok) {
         const errorText = await response.text();
         throw new Error(
            `Failed to fetch from GitHub: ${response.status} ${response.statusText}\n${errorText}`,
         );
      }

      const items: GitHubContentItem[] = await response.json();
      const files = new Map<string, string>();

      // Fetch all files and directories
      const fetchPromises = items.map(async (item) => {
         if (item.type === 'file' && item.download_url) {
            const content = await this.fetchRawFile(item.download_url, authToken);
            // Store path relative to the subpath
            const relativePath = item.path.replace(`${subpath}/`, '');
            files.set(relativePath, content);
         } else if (item.type === 'dir') {
            // Recursively fetch subdirectory
            const subFiles = await this.fetchFromGitHub(owner, repo, ref, item.path, authToken);
            // Merge subdirectory files with correct relative paths
            for (const [filePath, content] of subFiles) {
               const relativePath = `${item.name}/${filePath}`;
               files.set(relativePath, content);
            }
         }
      });

      await Promise.all(fetchPromises);

      return files;
   }

   /**
    * Fetch a raw file from GitHub
    */
   private async fetchRawFile(url: string, authToken?: string): Promise<string> {
      const headers: Record<string, string> = {
         'User-Agent': GitHubContentFetcher.USER_AGENT,
      };

      if (authToken) {
         headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
         throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }

      return response.text();
   }

   /**
    * Load content from local cache
    */
   private async loadFromCache(
      cacheDir: string,
   ): Promise<{ files: Map<string, string>; age: number } | null> {
      const metaPath = path.join(cacheDir, GitHubContentFetcher.CACHE_META_FILE);

      try {
         if (!fs.existsSync(metaPath)) {
            return null;
         }

         const metaContent = fs.readFileSync(metaPath, 'utf-8');
         const meta: CacheMetadata = JSON.parse(metaContent);
         const age = Date.now() - meta.timestamp;

         const files = new Map<string, string>();

         for (const filePath of meta.files) {
            // Validate path to prevent path traversal from corrupted/malicious cache metadata
            try {
               const fullPath = validatePathWithinBase(cacheDir, filePath);
               if (fs.existsSync(fullPath)) {
                  const content = fs.readFileSync(fullPath, 'utf-8');
                  files.set(filePath, content);
               }
            } catch {
               // Skip files with invalid paths (possible tampering)
               console.warn(`Skipping file with invalid path: ${filePath}`);
            }
         }

         // Return null if no files were loaded
         if (files.size === 0) {
            return null;
         }

         return { files, age };
      } catch {
         // Cache is corrupted or unreadable
         return null;
      }
   }

   /**
    * Save content to local cache
    */
   private async saveToCache(
      cacheDir: string,
      files: Map<string, string>,
      ref: string,
   ): Promise<void> {
      try {
         // Ensure cache directory exists
         if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
         }

         const fileList: string[] = [];

         // Write each file to cache
         for (const [filePath, content] of files) {
            // Validate path to prevent path traversal attacks from malicious GitHub responses
            const fullPath = validatePathWithinBase(cacheDir, filePath);
            const fileDir = path.dirname(fullPath);

            if (!fs.existsSync(fileDir)) {
               fs.mkdirSync(fileDir, { recursive: true });
            }

            fs.writeFileSync(fullPath, content, 'utf-8');
            fileList.push(filePath);
         }

         // Write metadata
         const meta: CacheMetadata = {
            timestamp: Date.now(),
            ref,
            files: fileList,
         };

         const metaPath = path.join(cacheDir, GitHubContentFetcher.CACHE_META_FILE);
         fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
      } catch (error) {
         // Cache write failure is not critical, just log it
         console.warn('Failed to write cache:', error);
      }
   }

   /**
    * Clear the cache for a specific repo/subpath or all cached content
    */
   async clearCache(options?: { owner?: string; repo?: string; subpath?: string }): Promise<void> {
      const cacheDir = this.defaultCacheDir;

      if (!options || (!options.owner && !options.repo)) {
         // Clear all cache
         if (fs.existsSync(cacheDir)) {
            fs.rmSync(cacheDir, { recursive: true, force: true });
         }
         return;
      }

      // Clear specific cache
      const { owner, repo, subpath } = options;
      const targetDir = path.join(
         cacheDir,
         `${owner}-${repo}`,
         subpath?.replace(/\//g, '-') || '',
      );

      if (fs.existsSync(targetDir)) {
         fs.rmSync(targetDir, { recursive: true, force: true });
      }
   }

   /**
    * Get information about cached content
    */
   getCacheInfo(options: {
      owner: string;
      repo: string;
      subpath: string;
   }): { exists: boolean; age?: number; fileCount?: number } | null {
      const { owner, repo, subpath } = options;
      const cacheDir = path.join(
         this.defaultCacheDir,
         `${owner}-${repo}`,
         subpath.replace(/\//g, '-'),
      );
      const metaPath = path.join(cacheDir, GitHubContentFetcher.CACHE_META_FILE);

      try {
         if (!fs.existsSync(metaPath)) {
            return { exists: false };
         }

         const metaContent = fs.readFileSync(metaPath, 'utf-8');
         const meta: CacheMetadata = JSON.parse(metaContent);

         return {
            exists: true,
            age: Date.now() - meta.timestamp,
            fileCount: meta.files.length,
         };
      } catch {
         return { exists: false };
      }
   }
}
