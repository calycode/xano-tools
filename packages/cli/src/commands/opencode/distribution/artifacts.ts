import fs from 'node:fs';
import path from 'node:path';
import { log } from '@clack/prompts';
import { GitHubContentFetcher } from '../../../utils/github-content-fetcher';
import { getCalycodeOpencodeConfigDir } from './paths';

/**
 * An installable OpenCode payload: a template set or a skill set.
 */
export type ArtifactKind = 'templates' | 'skills';

interface ArtifactSource {
   label: string;
   fetch: { owner: string; repo: string; subpath: string; ref: string };
   /** Directory the artifact installs into, relative to the OpenCode config dir. */
   targetRelative: string;
   /** Strip this prefix from fetched paths before installing. */
   sourcePrefix?: string;
   skipFileNames: string[];
   extraDirs: string[];
   localDirName: string;
   localHasContent: (dir: string) => boolean;
   reportAsNames: boolean;
}

const ARTIFACT_SOURCES: Record<ArtifactKind, ArtifactSource> = {
   templates: {
      label: 'OpenCode configuration templates',
      fetch: {
         owner: 'calycode',
         repo: 'xano-tools',
         subpath: 'packages/opencode-templates',
         ref: 'main',
      },
      targetRelative: '',
      skipFileNames: ['package.json'],
      extraDirs: ['agents', 'commands'],
      localDirName: 'opencode-templates',
      localHasContent: (dir) => fs.existsSync(path.join(dir, 'opencode.json')),
      reportAsNames: false,
   },
   skills: {
      label: 'Xano skills',
      fetch: {
         owner: 'calycode',
         repo: 'xano-tools',
         subpath: 'packages/xano-skills',
         ref: 'main',
      },
      targetRelative: 'skills',
      sourcePrefix: 'skills/',
      skipFileNames: [],
      extraDirs: [],
      localDirName: 'xano-skills',
      localHasContent: (dir) => {
         const skillsDir = path.join(dir, 'skills');
         return fs.existsSync(skillsDir) && fs.readdirSync(skillsDir).length > 0;
      },
      reportAsNames: true,
   },
};

export interface ArtifactInstallStatus {
   installed: boolean;
   dir?: string;
   count?: number;
   lastModified?: Date;
   files?: string[];
}

function localCandidates(dirName: string): string[] {
   return [
      path.resolve(__dirname, `../../${dirName}`),
      path.resolve(__dirname, `../../../${dirName}`),
      path.resolve(__dirname, `../../../../${dirName}`),
      path.resolve(__dirname, `../../../../packages/${dirName}`),
      path.resolve(__dirname, `../../../packages/${dirName}`),
   ];
}

/**
 * Try to find a local artifact in the monorepo (development fallback).
 * Returns the path to the artifact package if found, otherwise null.
 */
function findLocalArtifact(source: ArtifactSource): string | null {
   for (const candidate of localCandidates(source.localDirName)) {
      if (source.localHasContent(candidate)) {
         return candidate;
      }
   }
   return null;
}

/**
 * Read all artifact files from a local package directory.
 * Returns a Map of relative paths to file contents.
 */
function readLocalArtifact(source: ArtifactSource, baseDir: string): Map<string, string> {
   const root = source.targetRelative ? path.join(baseDir, source.targetRelative) : baseDir;
   const files = new Map<string, string>();

   if (!fs.existsSync(root)) {
      return files;
   }

   function readDir(dir: string, relativePath: string = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
         const fullPath = path.join(dir, entry.name);
         const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

         if (entry.isDirectory()) {
            readDir(fullPath, relPath);
         } else if (entry.isFile()) {
            // Normalize path separators for consistency
            const normalizedPath = relPath.replace(/\\/g, '/');
            files.set(normalizedPath, fs.readFileSync(fullPath, 'utf-8'));
         }
      }
   }

   readDir(root);
   return files;
}

/**
 * Fetches and installs an artifact (templates or skills).
 * Fetched from GitHub and cached locally for offline use, falling back to a
 * local monorepo copy during development if the fetch fails.
 */
export async function installArtifact(
   kind: ArtifactKind,
   options: { force?: boolean } = {},
): Promise<void> {
   const { force = false } = options;
   const source = ARTIFACT_SOURCES[kind];
   const fetcher = new GitHubContentFetcher();
   const configDir = getCalycodeOpencodeConfigDir();
   const targetDir = source.targetRelative
      ? path.join(configDir, source.targetRelative)
      : configDir;

   log.info(`Fetching ${source.label}...`);
   log.info(`Installing to: ${targetDir}`);

   let files: Map<string, string>;
   let sourceDescription: string;

   try {
      const result = await fetcher.fetchDirectory({
         ...source.fetch,
         preferOffline: true,
         force,
      });

      if (source.sourcePrefix) {
         files = new Map<string, string>();
         for (const [filePath, content] of result.files) {
            if (filePath.startsWith(source.sourcePrefix)) {
               files.set(filePath.substring(source.sourcePrefix.length), content);
            }
         }
      } else {
         files = result.files;
      }

      if (result.fromCache && result.cacheAge !== undefined) {
         const ageMinutes = Math.round(result.cacheAge / 1000 / 60);
         sourceDescription = `cached ${kind} (${ageMinutes} minutes old)`;
         log.info(`Using ${sourceDescription}`);
      } else {
         sourceDescription = `latest ${kind} from GitHub`;
         log.success(`Downloaded ${sourceDescription}`);
      }
   } catch (error: any) {
      log.warn(`GitHub fetch failed: ${error.message}`);

      const localPath = findLocalArtifact(source);
      if (localPath) {
         log.info(`Falling back to local ${kind}: ${localPath}`);
         files = readLocalArtifact(source, localPath);
         sourceDescription = `local ${kind} (development mode)`;
         log.success(`Using ${sourceDescription}`);
      } else {
         log.error(`No local ${kind} found. Cannot install.`);
         throw new Error(
            `Failed to fetch ${kind} from GitHub and no local fallback available.`,
         );
      }
   }

   // Ensure install directory and any fixed subdirectories exist
   if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
   }
   for (const dir of source.extraDirs) {
      const fullPath = path.join(targetDir, dir);
      if (!fs.existsSync(fullPath)) {
         fs.mkdirSync(fullPath, { recursive: true });
      }
   }

   const installed: string[] = [];
   const skipped: string[] = [];

   for (const [filePath, content] of files) {
      if (source.skipFileNames.includes(filePath)) {
         continue;
      }

      const destPath = path.join(targetDir, filePath);
      const destDir = path.dirname(destPath);

      if (!fs.existsSync(destDir)) {
         fs.mkdirSync(destDir, { recursive: true });
      }

      // Don't overwrite existing user customizations unless --force
      if (!force && fs.existsSync(destPath)) {
         skipped.push(filePath);
         continue;
      }

      fs.writeFileSync(destPath, content, 'utf-8');
      installed.push(filePath);
   }

   reportInstall(kind, source, installed, skipped);
   log.success(`${source.label} installed to: ${targetDir}`);
}

function reportInstall(
   kind: ArtifactKind,
   source: ArtifactSource,
   installed: string[],
   skipped: string[],
): void {
   const namesOf = (paths: string[]) => [
      ...new Set(paths.map((f) => f.split('/')[0]).filter((name) => name)),
   ];

   if (source.reportAsNames) {
      if (installed.length > 0) {
         const names = namesOf(installed);
         log.success(`Installed ${names.length} ${kind.replace(/s$/, '')}(s): ${names.join(', ')}`);
      }
      if (skipped.length > 0) {
         const names = namesOf(skipped);
         log.info(`Skipped ${names.length} existing ${kind.replace(/s$/, '')}(s) (use --force to overwrite)`);
      }
      return;
   }

   if (installed.length > 0) {
      const fileList = installed.map((f) => `  + ${f}`).join('\n');
      log.success(`Installed ${installed.length} ${source.label} file(s):\n${fileList}`);
   }
   if (skipped.length > 0) {
      const fileList = skipped.map((f) => `  - ${f}`).join('\n');
      log.info(`Skipped ${skipped.length} existing file(s) (use --force to overwrite):\n${fileList}`);
   }
}

/**
 * Update an artifact by forcing a fresh download from GitHub.
 */
export async function updateArtifact(kind: ArtifactKind): Promise<void> {
   log.info(`Updating ${ARTIFACT_SOURCES[kind].label}...`);
   await installArtifact(kind, { force: true });
   log.success(`${ARTIFACT_SOURCES[kind].label} updated successfully!`);
}

/**
 * Get the status of an installed artifact.
 */
export function getArtifactStatus(kind: ArtifactKind): ArtifactInstallStatus {
   const source = ARTIFACT_SOURCES[kind];
   const configDir = getCalycodeOpencodeConfigDir();

   if (kind === 'templates') {
      const configFile = path.join(configDir, 'opencode.json');
      if (!fs.existsSync(configFile)) {
         return { installed: false };
      }

      const templateDirs = ['agents', 'commands'];
      const templateFiles = ['opencode.json', 'AGENTS.md'];
      const files: string[] = [];
      let latestMtime: Date | undefined;

      for (const file of templateFiles) {
         const fullPath = path.join(configDir, file);
         if (fs.existsSync(fullPath)) {
            files.push(file);
            const stat = fs.statSync(fullPath);
            if (!latestMtime || stat.mtime > latestMtime) {
               latestMtime = stat.mtime;
            }
         }
      }

      for (const dir of templateDirs) {
         const dirPath = path.join(configDir, dir);
         if (!fs.existsSync(dirPath)) continue;
         for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
            if (entry.isFile() && entry.name.endsWith('.md')) {
               const fullPath = path.join(dirPath, entry.name);
               files.push(`${dir}/${entry.name}`);
               const stat = fs.statSync(fullPath);
               if (!latestMtime || stat.mtime > latestMtime) {
                  latestMtime = stat.mtime;
               }
            }
         }
      }

      return { installed: true, dir: configDir, count: files.length, lastModified: latestMtime, files };
   }

   const skillsDir = path.join(configDir, source.targetRelative);
   if (!fs.existsSync(skillsDir)) {
      return { installed: false };
   }

   const skills: string[] = [];
   let latestMtime: Date | undefined;

   for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
         const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
         if (fs.existsSync(skillMdPath)) {
            skills.push(entry.name);
            const stat = fs.statSync(skillMdPath);
            if (!latestMtime || stat.mtime > latestMtime) {
               latestMtime = stat.mtime;
            }
         }
      }
   }

   if (skills.length === 0) {
      return { installed: false };
   }

   return { installed: true, dir: skillsDir, count: skills.length, lastModified: latestMtime, files: skills };
}

/**
 * Clear an artifact's GitHub fetch cache.
 */
export async function clearArtifactCache(kind: ArtifactKind): Promise<void> {
   const fetcher = new GitHubContentFetcher();
   await fetcher.clearCache(ARTIFACT_SOURCES[kind].fetch);
   log.success(`${ARTIFACT_SOURCES[kind].label} cache cleared.`);
}
