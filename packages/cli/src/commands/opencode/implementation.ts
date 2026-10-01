import { log } from '@clack/prompts';
import fs from 'node:fs';
import path from 'node:path';
import { GitHubContentFetcher } from '../../utils/github-content-fetcher';
import {
   resolveOcVersion,
   warnIfUsingNonDefaultOcVersion,
   launchOpencodeServer,
   validatePort,
   getCalycodeOpencodeConfigDir,
   ensureManagedOpencodeInstalled,
   shouldUseManagedOpencodeInstall,
} from './distribution';
import {
   getAllowedCorsOrigins,
   setupNativeHostRegistration,
   showNativeHostStatus as showNativeHostStatusImpl,
} from './native-host';

/**
 * Options for setting up OpenCode configuration
 */
interface SetupOpencodeConfigOptions {
   /** Force re-download templates even if they exist */
   force?: boolean;
   /** Skip the native host setup */
   skipNativeHost?: boolean;
}

/**
 * Result of template installation status check
 */
interface TemplateInstallStatus {
   installed: boolean;
   configDir?: string;
   fileCount?: number;
   lastModified?: Date;
   files?: string[];
}

/**
 * Try to find local templates in the monorepo (development fallback).
 * Returns the path to local templates if found, otherwise null.
 */
function findLocalTemplatesPath(): string | null {
   // Check common locations relative to this script
   const possiblePaths = [
      // Relative to cli package in monorepo
      path.resolve(__dirname, '../../opencode-templates'),
      path.resolve(__dirname, '../../../opencode-templates'),
      path.resolve(__dirname, '../../../../packages/opencode-templates'),
      // Relative to dist folder
      path.resolve(__dirname, '../../../packages/opencode-templates'),
   ];

   for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, 'opencode.json'))) {
         return p;
      }
   }
   return null;
}

/**
 * Read all template files from a local directory.
 * Returns a Map of relative paths to file contents.
 */
function readLocalTemplates(templatesDir: string): Map<string, string> {
   const files = new Map<string, string>();

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

   readDir(templatesDir);
   return files;
}

/**
 * Configuration for fetching OpenCode templates from GitHub
 */
const TEMPLATES_CONFIG = {
   owner: 'calycode',
   repo: 'xano-tools',
   subpath: 'packages/opencode-templates',
   ref: 'main',
};

/**
 * Configuration for fetching Xano skills from GitHub
 */
const SKILLS_CONFIG = {
   owner: 'calycode',
   repo: 'xano-tools',
   subpath: 'packages/xano-skills',
   ref: 'main',
};

/**
 * Fetches and installs OpenCode configuration templates (agents, commands, instructions).
 * Templates are fetched from GitHub and cached locally for offline use.
 * Falls back to local templates (from monorepo) during development if GitHub fetch fails.
 *
 * Installed to: ~/.calycode/opencode/
 *   - opencode.json (default config)
 *   - AGENTS.md (global instructions)
 *   - agents/*.md (custom agents)
 *   - commands/*.md (custom slash commands)
 */
async function setupOpencodeConfig(options: SetupOpencodeConfigOptions = {}): Promise<void> {
   const { force = false } = options;
   const fetcher = new GitHubContentFetcher();
   // Use CalyCode-specific directory to avoid polluting user's global OpenCode config
   const configDir = getCalycodeOpencodeConfigDir();

   log.info('Fetching OpenCode configuration templates...');
   log.info(`Installing to: ${configDir}`);

   let files: Map<string, string>;
   let sourceDescription: string;

   try {
      // First, try to fetch from GitHub (with cache support)
      const result = await fetcher.fetchDirectory({
         ...TEMPLATES_CONFIG,
         preferOffline: true,
         force,
      });
      files = result.files;

      if (result.fromCache && result.cacheAge !== undefined) {
         const ageMinutes = Math.round(result.cacheAge / 1000 / 60);
         sourceDescription = `cached templates (${ageMinutes} minutes old)`;
         log.info(`Using ${sourceDescription}`);
      } else {
         sourceDescription = 'latest templates from GitHub';
         log.success(`Downloaded ${sourceDescription}`);
      }
   } catch (error: any) {
      // GitHub fetch failed - try local fallback for development
      log.warn(`GitHub fetch failed: ${error.message}`);

      const localPath = findLocalTemplatesPath();
      if (localPath) {
         log.info(`Falling back to local templates: ${localPath}`);
         files = readLocalTemplates(localPath);
         sourceDescription = 'local templates (development mode)';
         log.success(`Using ${sourceDescription}`);
      } else {
         log.error('No local templates found. Cannot install configuration.');
         throw new Error(
            'Failed to fetch templates from GitHub and no local fallback available.',
         );
      }
   }

   // Ensure base config directory exists
   if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
   }

   // Ensure subdirectories exist
   const subdirs = ['agents', 'commands'];
   for (const dir of subdirs) {
      const fullPath = path.join(configDir, dir);
      if (!fs.existsSync(fullPath)) {
         fs.mkdirSync(fullPath, { recursive: true });
      }
   }

   // Track what was installed
   const installed: string[] = [];
   const skipped: string[] = [];

   // Write files to OpenCode config directory
   for (const [filePath, content] of files) {
      // Skip package.json - it's just for the template package metadata
      if (filePath === 'package.json') {
         continue;
      }

      const destPath = path.join(configDir, filePath);
      const destDir = path.dirname(destPath);

      // Ensure destination directory exists
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

   // Report results
   if (installed.length > 0) {
      const fileList = installed.map((f) => `  + ${f}`).join('\n');
      log.success(`Installed ${installed.length} template file(s):\n${fileList}`);
   }

   if (skipped.length > 0) {
      const fileList = skipped.map((f) => `  - ${f}`).join('\n');
      log.info(`Skipped ${skipped.length} existing file(s) (use --force to overwrite):\n${fileList}`);
   }

   log.success(`OpenCode configuration installed to: ${configDir}`);
}

/**
 * Update OpenCode templates by forcing a fresh download from GitHub.
 */
async function updateOpencodeTemplates(): Promise<void> {
   log.info('Updating OpenCode templates...');
   await setupOpencodeConfig({ force: true });
   log.success('Templates updated successfully!');
}

/**
 * Get the status of installed OpenCode templates.
 * Checks the installed config directory, not the GitHub cache.
 */
function getTemplateInstallStatus(): TemplateInstallStatus {
   const configDir = getCalycodeOpencodeConfigDir();
   const configFile = path.join(configDir, 'opencode.json');

   // Check if the main config file exists
   if (!fs.existsSync(configFile)) {
      return { installed: false };
   }

   // Only count template files we care about (not node_modules, etc.)
   const templateDirs = ['agents', 'commands'];
   const templateFiles = ['opencode.json', 'AGENTS.md'];

   const files: string[] = [];
   let latestMtime: Date | undefined;

   // Check root template files
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

   // Scan template directories
   for (const dir of templateDirs) {
      const dirPath = path.join(configDir, dir);
      if (!fs.existsSync(dirPath)) continue;

      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
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

   return {
      installed: true,
      configDir,
      fileCount: files.length,
      lastModified: latestMtime,
      files,
   };
}

/**
 * Clear the template cache.
 */
async function clearTemplateCache(): Promise<void> {
   const fetcher = new GitHubContentFetcher();
   await fetcher.clearCache(TEMPLATES_CONFIG);
   log.success('Template cache cleared.');
}

// --- Skills Installation ---

/**
 * Result of skills installation status check
 */
interface SkillsInstallStatus {
   installed: boolean;
   skillsDir?: string;
   skillCount?: number;
   lastModified?: Date;
   skills?: string[];
}

/**
 * Try to find local skills in the monorepo (development fallback).
 * Returns the path to local skills if found, otherwise null.
 */
function findLocalSkillsPath(): string | null {
   // Check common locations relative to this script
   const possiblePaths = [
      // Relative to cli package in monorepo
      path.resolve(__dirname, '../../xano-skills'),
      path.resolve(__dirname, '../../../xano-skills'),
      path.resolve(__dirname, '../../../../packages/xano-skills'),
      // Relative to dist folder
      path.resolve(__dirname, '../../../packages/xano-skills'),
   ];

   for (const p of possiblePaths) {
      // Check for skills directory with at least one skill
      const skillsDir = path.join(p, 'skills');
      if (fs.existsSync(skillsDir) && fs.readdirSync(skillsDir).length > 0) {
         return p;
      }
   }
   return null;
}

/**
 * Read all skill files from a local directory.
 * Returns a Map of relative paths to file contents.
 */
function readLocalSkills(skillsPackageDir: string): Map<string, string> {
   const files = new Map<string, string>();
   const skillsDir = path.join(skillsPackageDir, 'skills');

   if (!fs.existsSync(skillsDir)) {
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

   readDir(skillsDir);
   return files;
}

/**
 * Fetches and installs Xano skills for AI agents.
 * Skills are fetched from GitHub and cached locally for offline use.
 * Falls back to local skills (from monorepo) during development if GitHub fetch fails.
 *
 * Installed to: ~/.calycode/opencode/skills/
 *   - <skill-name>/SKILL.md
 */
async function setupOpencodeSkills(options: { force?: boolean } = {}): Promise<void> {
   const { force = false } = options;
   const fetcher = new GitHubContentFetcher();
   const configDir = getCalycodeOpencodeConfigDir();
   const skillsDir = path.join(configDir, 'skills');

   log.info('Fetching Xano skills...');
   log.info(`Installing to: ${skillsDir}`);

   let files: Map<string, string>;
   let sourceDescription: string;

   try {
      // First, try to fetch from GitHub (with cache support)
      const result = await fetcher.fetchDirectory({
         ...SKILLS_CONFIG,
         preferOffline: true,
         force,
      });

      // Extract only the skills/ subdirectory from the package
      files = new Map<string, string>();
      for (const [filePath, content] of result.files) {
         if (filePath.startsWith('skills/')) {
            // Remove the 'skills/' prefix since we'll install to skillsDir
            const relativePath = filePath.substring('skills/'.length);
            files.set(relativePath, content);
         }
      }

      if (result.fromCache && result.cacheAge !== undefined) {
         const ageMinutes = Math.round(result.cacheAge / 1000 / 60);
         sourceDescription = `cached skills (${ageMinutes} minutes old)`;
         log.info(`Using ${sourceDescription}`);
      } else {
         sourceDescription = 'latest skills from GitHub';
         log.success(`Downloaded ${sourceDescription}`);
      }
   } catch (error: any) {
      // GitHub fetch failed - try local fallback for development
      log.warn(`GitHub fetch failed: ${error.message}`);

      const localPath = findLocalSkillsPath();
      if (localPath) {
         log.info(`Falling back to local skills: ${localPath}`);
         files = readLocalSkills(localPath);
         sourceDescription = 'local skills (development mode)';
         log.success(`Using ${sourceDescription}`);
      } else {
         log.error('No local skills found. Cannot install skills.');
         throw new Error('Failed to fetch skills from GitHub and no local fallback available.');
      }
   }

   // Ensure skills directory exists
   if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
   }

   // Track what was installed
   const installed: string[] = [];
   const skipped: string[] = [];

   // Write skill files to skills directory
   for (const [filePath, content] of files) {
      const destPath = path.join(skillsDir, filePath);
      const destDir = path.dirname(destPath);

      // Ensure destination directory exists
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

   // Report results
   if (installed.length > 0) {
      const skillNames = [
         ...new Set(installed.map((f) => f.split('/')[0]).filter((name) => name)),
      ];
      log.success(`Installed ${skillNames.length} skill(s): ${skillNames.join(', ')}`);
   }

   if (skipped.length > 0) {
      const skillNames = [
         ...new Set(skipped.map((f) => f.split('/')[0]).filter((name) => name)),
      ];
      log.info(`Skipped ${skillNames.length} existing skill(s) (use --force to overwrite)`);
   }

   log.success(`Skills installed to: ${skillsDir}`);
}

/**
 * Update skills by forcing a fresh download from GitHub.
 */
async function updateOpencodeSkills(): Promise<void> {
   log.info('Updating Xano skills...');
   await setupOpencodeSkills({ force: true });
   log.success('Skills updated successfully!');
}

/**
 * Get the status of installed skills.
 */
function getSkillsInstallStatus(): SkillsInstallStatus {
   const configDir = getCalycodeOpencodeConfigDir();
   const skillsDir = path.join(configDir, 'skills');

   if (!fs.existsSync(skillsDir)) {
      return { installed: false };
   }

   const skills: string[] = [];
   let latestMtime: Date | undefined;

   // Scan skills directories
   const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
   for (const entry of entries) {
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

   return {
      installed: true,
      skillsDir,
      skillCount: skills.length,
      lastModified: latestMtime,
      skills,
   };
}

/**
 * Clear the skills cache.
 */
async function clearSkillsCache(): Promise<void> {
   const fetcher = new GitHubContentFetcher();
   await fetcher.clearCache(SKILLS_CONFIG);
   log.success('Skills cache cleared.');
}

async function serveOpencode({
   port = 4096,
   detach = false,
   ocVersion,
}: {
   port?: number;
   detach?: boolean;
   ocVersion?: string;
}) {
   // Validate port
   validatePort(port);

   const resolvedVersion = resolveOcVersion(ocVersion);
   warnIfUsingNonDefaultOcVersion(resolvedVersion);

   if (detach) {
      log.info(`Starting OpenCode server on port ${port} in background...`);
      const launched = launchOpencodeServer({
         port,
         stdio: 'ignore',
         detach: true,
         ocVersion: resolvedVersion,
         allowedOrigins: getAllowedCorsOrigins(),
      });
      log.info(`OpenCode launcher: ${launched.plan.source}`);
      const proc = launched.proc;
      proc.unref();
      log.success('OpenCode server started in background.');
      return;
   }

   return new Promise<void>((resolve, reject) => {
      log.info(`Starting OpenCode server on port ${port}...`);

      const launched = launchOpencodeServer({
         port,
         stdio: 'inherit',
         ocVersion: resolvedVersion,
         allowedOrigins: getAllowedCorsOrigins(),
      });
      log.info(`OpenCode launcher: ${launched.plan.source}`);
      const proc = launched.proc;

      proc.on('close', (code) => {
         if (code === 0) {
            resolve();
         } else {
            reject(new Error(`OpenCode server exited with code ${code}`));
         }
      });

      proc.on('error', (err) => {
         reject(new Error(`Failed to start OpenCode server: ${err.message}`));
      });
   });
}

async function setupOpencode({
   extensionIds,
   force = false,
   skipConfig = false,
   ocVersion,
}: {
   extensionIds?: string[];
   force?: boolean;
   skipConfig?: boolean;
   ocVersion?: string;
} = {}) {
   const resolvedVersion = resolveOcVersion(ocVersion);
   warnIfUsingNonDefaultOcVersion(resolvedVersion);

   if (shouldUseManagedOpencodeInstall()) {
      try {
         const managedBinPath = ensureManagedOpencodeInstalled(resolvedVersion);
         log.info(`Managed OpenCode launcher ready: ${managedBinPath}`);
      } catch (error: any) {
         log.warn(
            `Managed OpenCode install failed (${error?.message || 'unknown error'}). Falling back to global/npx launchers.`,
         );
      }
   }

   await setupNativeHostRegistration(extensionIds, resolvedVersion);
   log.info('Native host setup complete.');

   // Setup OpenCode configuration (agents, commands, instructions)
   if (!skipConfig) {
      log.info('');
      await setupOpencodeConfig({ force });
      log.info('');
      await setupOpencodeSkills({ force });
   }

   log.info('');
   log.success('Setup complete! OpenCode is ready to use.');
}

function showNativeHostStatus(): void {
   showNativeHostStatusImpl();
}

export {
   serveOpencode,
   setupOpencode,
   showNativeHostStatus,
   setupOpencodeConfig,
   updateOpencodeTemplates,
   getTemplateInstallStatus,
   clearTemplateCache,
   setupOpencodeSkills,
   updateOpencodeSkills,
   getSkillsInstallStatus,
   clearSkillsCache,
};
