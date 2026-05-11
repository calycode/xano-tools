import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { HOST_APP_INFO } from '../../../utils/host-constants';

const CHROME_EXTENSION_ID_REGEX = /^[a-p]{32}$/;

const BUILD_OC_DEFAULTS = {
   extDiscoveryMode: process.env.CALY_BUILD_OC_EXT_DISCOVERY_MODE,
   extName: process.env.CALY_BUILD_OC_EXT_NAME,
   extTrustedAuthors: process.env.CALY_BUILD_OC_EXT_TRUSTED_AUTHORS,
   extTrustedHomepages: process.env.CALY_BUILD_OC_EXT_TRUSTED_HOMEPAGES,
   extTrustedUpdateUrls: process.env.CALY_BUILD_OC_EXT_TRUSTED_UPDATE_URLS,
   extRequireNativeMessaging: process.env.CALY_BUILD_OC_EXT_REQUIRE_NATIVE_MESSAGING,
   extPublicKeyB64: process.env.CALY_BUILD_OC_EXT_PUBLIC_KEY_B64,
   extDiscoveryEnabled: process.env.CALY_BUILD_OC_EXT_DISCOVERY_ENABLED,
   extIncludeKnownIds: process.env.CALY_BUILD_OC_EXT_INCLUDE_KNOWN_IDS,
   writeAllBrowserManifests: process.env.CALY_BUILD_OC_WRITE_ALL_BROWSER_MANIFESTS,
};

interface ChromiumUserDataRoot {
   browser: string;
   userDataPath: string;
}

interface ExtensionManifest {
   name?: string;
   author?: string;
   key?: string;
   homepage_url?: string;
   update_url?: string;
   permissions?: string[];
   optional_permissions?: string[];
   default_locale?: string;
}

interface ExtensionDiscoveryConfig {
   mode: 'strict' | 'balanced' | 'name-only';
   extensionName: string;
   trustedAuthorPatterns: string[];
   trustedHomepagePrefixes: string[];
   trustedUpdateUrlPrefixes: string[];
   requireNativeMessagingPermission: boolean;
   expectedPublicKeyBase64?: string;
}

interface ExtensionCandidateMatch {
   id: string;
   browser: string;
   profile: string;
   name: string;
   confidence: 'high' | 'medium' | 'low';
   reasons: string[];
}

interface ResolveExtensionIdsResult {
   ids: string[];
   matched: ExtensionCandidateMatch[];
   source: string;
}

function parseBooleanEnv(envValue: string | undefined, defaultValue: boolean): boolean {
   if (!envValue) {
      return defaultValue;
   }

   const normalized = envValue.trim().toLowerCase();
   if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
   }
   if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
   }
   return defaultValue;
}

function parseListEnv(envValue: string | undefined): string[] {
   if (!envValue) {
      return [];
   }
   return envValue
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
}

function resolveEnvWithBuildFallback(runtimeEnv: string | undefined, buildEnv: string | undefined): string | undefined {
   const runtimeValue = runtimeEnv?.trim();
   if (runtimeValue) {
      return runtimeValue;
   }

   const buildValue = buildEnv?.trim();
   if (buildValue) {
      return buildValue;
   }

   return undefined;
}

function parseBooleanEnvWithBuildFallback(
   runtimeEnv: string | undefined,
   buildEnv: string | undefined,
   defaultValue: boolean,
): boolean {
   const runtimeValue = runtimeEnv?.trim();
   if (runtimeValue) {
      return parseBooleanEnv(runtimeValue, defaultValue);
   }

   const buildValue = buildEnv?.trim();
   if (buildValue) {
      return parseBooleanEnv(buildValue, defaultValue);
   }

   return defaultValue;
}

function parseListEnvWithBuildFallback(runtimeEnv: string | undefined, buildEnv: string | undefined): string[] {
   const runtimeList = parseListEnv(runtimeEnv);
   if (runtimeList.length > 0) {
      return runtimeList;
   }

   return parseListEnv(buildEnv);
}

function normalizeLower(value: string | undefined): string {
   return (value || '').trim().toLowerCase();
}

function isValidExtensionId(id: string): boolean {
   return CHROME_EXTENSION_ID_REGEX.test(id);
}

function resolveExtensionIdFromPublicKeyBase64(base64Key: string): string | null {
   try {
      const keyBuffer = Buffer.from(base64Key, 'base64');
      if (keyBuffer.length === 0) {
         return null;
      }

      const digest = createHash('sha256').update(keyBuffer).digest();
      const chars = 'abcdefghijklmnop';
      let id = '';
      for (const byte of digest.subarray(0, 16)) {
         id += chars[(byte >> 4) & 0x0f] + chars[byte & 0x0f];
      }
      return id;
   } catch {
      return null;
   }
}

function getExtensionDiscoveryConfig(): ExtensionDiscoveryConfig {
   const envMode = normalizeLower(
      resolveEnvWithBuildFallback(
         process.env.CALY_OC_EXT_DISCOVERY_MODE,
         BUILD_OC_DEFAULTS.extDiscoveryMode,
      ),
   );
   const mode: 'strict' | 'balanced' | 'name-only' =
      envMode === 'strict' || envMode === 'name-only' || envMode === 'balanced'
         ? envMode
         : HOST_APP_INFO.extensionDiscovery.mode;

   const trustedAuthorPatterns = parseListEnvWithBuildFallback(
      process.env.CALY_OC_EXT_TRUSTED_AUTHORS,
      BUILD_OC_DEFAULTS.extTrustedAuthors,
   );
   const trustedHomepagePrefixes = parseListEnvWithBuildFallback(
      process.env.CALY_OC_EXT_TRUSTED_HOMEPAGES,
      BUILD_OC_DEFAULTS.extTrustedHomepages,
   );
   const trustedUpdateUrlPrefixes = parseListEnvWithBuildFallback(
      process.env.CALY_OC_EXT_TRUSTED_UPDATE_URLS,
      BUILD_OC_DEFAULTS.extTrustedUpdateUrls,
   );

   return {
      mode,
      extensionName:
         resolveEnvWithBuildFallback(process.env.CALY_OC_EXT_NAME, BUILD_OC_DEFAULTS.extName) ||
         HOST_APP_INFO.extensionDiscovery.extensionName,
      trustedAuthorPatterns:
         trustedAuthorPatterns.length > 0
            ? trustedAuthorPatterns
            : HOST_APP_INFO.extensionDiscovery.trustedAuthorPatterns,
      trustedHomepagePrefixes:
         trustedHomepagePrefixes.length > 0
            ? trustedHomepagePrefixes
            : HOST_APP_INFO.extensionDiscovery.trustedHomepagePrefixes,
      trustedUpdateUrlPrefixes:
         trustedUpdateUrlPrefixes.length > 0
            ? trustedUpdateUrlPrefixes
            : ['https://clients2.google.com/service/update2/crx'],
      requireNativeMessagingPermission: parseBooleanEnv(
         resolveEnvWithBuildFallback(
            process.env.CALY_OC_EXT_REQUIRE_NATIVE_MESSAGING,
            BUILD_OC_DEFAULTS.extRequireNativeMessaging,
         ),
         HOST_APP_INFO.extensionDiscovery.requireNativeMessagingPermission,
      ),
      expectedPublicKeyBase64: resolveEnvWithBuildFallback(
         process.env.CALY_OC_EXT_PUBLIC_KEY_B64,
         BUILD_OC_DEFAULTS.extPublicKeyB64,
      ),
   };
}

function getChromiumUserDataRoots(platform: NodeJS.Platform, homeDir: string): ChromiumUserDataRoot[] {
   if (platform === 'darwin') {
      return [
         {
            browser: 'Chrome',
            userDataPath: path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome'),
         },
         {
            browser: 'Brave',
            userDataPath: path.join(homeDir, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser'),
         },
         {
            browser: 'Edge',
            userDataPath: path.join(homeDir, 'Library', 'Application Support', 'Microsoft Edge'),
         },
         {
            browser: 'Chromium',
            userDataPath: path.join(homeDir, 'Library', 'Application Support', 'Chromium'),
         },
      ];
   }

   if (platform === 'linux') {
      return [
         { browser: 'Chrome', userDataPath: path.join(homeDir, '.config', 'google-chrome') },
         {
            browser: 'Brave',
            userDataPath: path.join(homeDir, '.config', 'BraveSoftware', 'Brave-Browser'),
         },
         { browser: 'Edge', userDataPath: path.join(homeDir, '.config', 'microsoft-edge') },
         { browser: 'Chromium', userDataPath: path.join(homeDir, '.config', 'chromium') },
      ];
   }

   if (platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA;
      if (!localAppData) {
         return [];
      }

      return [
         {
            browser: 'Chrome',
            userDataPath: path.join(localAppData, 'Google', 'Chrome', 'User Data'),
         },
         {
            browser: 'Brave',
            userDataPath: path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data'),
         },
         {
            browser: 'Edge',
            userDataPath: path.join(localAppData, 'Microsoft', 'Edge', 'User Data'),
         },
         {
            browser: 'Chromium',
            userDataPath: path.join(localAppData, 'Chromium', 'User Data'),
         },
      ];
   }

   return [];
}

function readJsonFile<T>(filePath: string): T | null {
   try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw) as T;
   } catch {
      return null;
   }
}

function getProfileDirectories(userDataPath: string): string[] {
   if (!fs.existsSync(userDataPath)) {
      return [];
   }

   const entries = fs.readdirSync(userDataPath, { withFileTypes: true });
   const profiles: string[] = [];
   for (const entry of entries) {
      if (!entry.isDirectory()) {
         continue;
      }

      const dirName = entry.name;
      const isLikelyProfile =
         dirName === 'Default' || dirName.startsWith('Profile ') || dirName === 'Guest Profile';
      if (!isLikelyProfile) {
         continue;
      }

      const profilePath = path.join(userDataPath, dirName);
      if (fs.existsSync(path.join(profilePath, 'Preferences'))) {
         profiles.push(profilePath);
      }
   }

   return profiles;
}

function resolveLocalizedMessage(
   extensionVersionPath: string,
   locale: string | undefined,
   messageKey: string,
): string | null {
   if (!locale) {
      return null;
   }

   const localeCandidates = [locale, 'en', 'en_US'];
   for (const candidate of localeCandidates) {
      const messagesPath = path.join(extensionVersionPath, '_locales', candidate, 'messages.json');
      const messages = readJsonFile<Record<string, { message?: string }>>(messagesPath);
      if (messages && messages[messageKey]?.message) {
         return messages[messageKey].message || null;
      }
   }

   return null;
}

function resolveManifestName(manifest: ExtensionManifest, extensionVersionPath: string): string {
   if (!manifest.name) {
      return '';
   }

   const localizedMatch = manifest.name.match(/^__MSG_([^_]+)__$/);
   if (!localizedMatch) {
      return manifest.name;
   }

   const localized = resolveLocalizedMessage(
      extensionVersionPath,
      manifest.default_locale,
      localizedMatch[1],
   );
   return localized || manifest.name;
}

function getLatestExtensionVersionPath(extensionRootPath: string): string | null {
   if (!fs.existsSync(extensionRootPath)) {
      return null;
   }

   const versionDirs = fs
      .readdirSync(extensionRootPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(extensionRootPath, entry.name));

   if (versionDirs.length === 0) {
      return null;
   }

   versionDirs.sort((a, b) => {
      const aTime = fs.statSync(a).mtimeMs;
      const bTime = fs.statSync(b).mtimeMs;
      return bTime - aTime;
   });

   return versionDirs[0];
}

function discoverExtensionIds(): ResolveExtensionIdsResult {
   const platform = os.platform();
   const homeDir = os.homedir();
   const config = getExtensionDiscoveryConfig();
   const expectedIdFromPublicKey = config.expectedPublicKeyBase64
      ? resolveExtensionIdFromPublicKeyBase64(config.expectedPublicKeyBase64)
      : null;

   const targetName = normalizeLower(config.extensionName);
   const trustedAuthors = config.trustedAuthorPatterns.map((pattern) => normalizeLower(pattern));
   const trustedHomepages = config.trustedHomepagePrefixes.map((prefix) => normalizeLower(prefix));
   const trustedUpdateUrls = config.trustedUpdateUrlPrefixes.map((prefix) => normalizeLower(prefix));

   const matches: ExtensionCandidateMatch[] = [];

   for (const root of getChromiumUserDataRoots(platform, homeDir)) {
      for (const profilePath of getProfileDirectories(root.userDataPath)) {
         const extensionsPath = path.join(profilePath, 'Extensions');
         if (!fs.existsSync(extensionsPath)) {
            continue;
         }

         const extensionEntries = fs.readdirSync(extensionsPath, { withFileTypes: true });
         for (const extensionEntry of extensionEntries) {
            if (!extensionEntry.isDirectory()) {
               continue;
            }

            const extensionId = extensionEntry.name;
            if (!isValidExtensionId(extensionId)) {
               continue;
            }

            const extensionRootPath = path.join(extensionsPath, extensionId);
            const latestVersionPath = getLatestExtensionVersionPath(extensionRootPath);
            if (!latestVersionPath) {
               continue;
            }

            const manifestPath = path.join(latestVersionPath, 'manifest.json');
            const manifest = readJsonFile<ExtensionManifest>(manifestPath);
            if (!manifest) {
               continue;
            }

            const name = resolveManifestName(manifest, latestVersionPath);
            const normalizedName = normalizeLower(name);
            if (!normalizedName || normalizedName !== targetName) {
               continue;
            }

            const permissions = [...(manifest.permissions || []), ...(manifest.optional_permissions || [])].map((perm) =>
               normalizeLower(perm),
            );
            const hasNativeMessagingPermission = permissions.includes('nativemessaging');
            if (config.requireNativeMessagingPermission && !hasNativeMessagingPermission) {
               continue;
            }

            if (expectedIdFromPublicKey && extensionId !== expectedIdFromPublicKey) {
               continue;
            }

            const author = normalizeLower(manifest.author);
            const homepage = normalizeLower(manifest.homepage_url);
            const updateUrl = normalizeLower(manifest.update_url);
            const manifestKeyDerivedId = manifest.key
               ? resolveExtensionIdFromPublicKeyBase64(manifest.key)
               : null;

            const authorMatch = trustedAuthors.some((pattern) => author.includes(pattern));
            const homepageMatch = trustedHomepages.some((prefix) => homepage.startsWith(prefix));
            const updateUrlMatch = trustedUpdateUrls.some((prefix) => updateUrl.startsWith(prefix));
            const keyMatchesId = manifestKeyDerivedId ? manifestKeyDerivedId === extensionId : false;

            const trustSignals = [authorMatch, homepageMatch, updateUrlMatch, keyMatchesId].filter(
               Boolean,
            ).length;

            let accepted = false;
            let confidence: 'high' | 'medium' | 'low' = 'low';

            if (config.mode === 'name-only') {
               accepted = true;
               confidence = 'low';
            } else if (config.mode === 'strict') {
               accepted = trustSignals >= 2;
               confidence = accepted ? 'high' : 'low';
            } else {
               accepted = trustSignals >= 1 || hasNativeMessagingPermission;
               confidence = trustSignals >= 2 ? 'high' : trustSignals >= 1 ? 'medium' : 'low';
            }

            if (!accepted) {
               continue;
            }

            const profileName = path.basename(profilePath);
            const reasons: string[] = [];
            reasons.push(`name=${name}`);
            if (hasNativeMessagingPermission) reasons.push('nativeMessaging');
            if (authorMatch) reasons.push('author');
            if (homepageMatch) reasons.push('homepage');
            if (updateUrlMatch) reasons.push('update_url');
            if (keyMatchesId) reasons.push('manifest_key');
            if (expectedIdFromPublicKey) reasons.push('expected_public_key');

            matches.push({
               id: extensionId,
               browser: root.browser,
               profile: profileName,
               name,
               confidence,
               reasons,
            });
         }
      }
   }

   const deduped = new Map<string, ExtensionCandidateMatch>();
   for (const match of matches) {
      const existing = deduped.get(match.id);
      if (!existing) {
         deduped.set(match.id, match);
         continue;
      }

      const confidenceRank = { high: 3, medium: 2, low: 1 };
      if (confidenceRank[match.confidence] > confidenceRank[existing.confidence]) {
         deduped.set(match.id, match);
      }
   }

   const ids = Array.from(deduped.keys()).sort();
   return {
      ids,
      matched: Array.from(deduped.values()).sort((a, b) => a.id.localeCompare(b.id)),
      source: `discovery:${config.mode}`,
   };
}

function resolveAllowedExtensionIds(providedIds?: string[]): ResolveExtensionIdsResult {
   if (providedIds?.length) {
      const uniqueIds = Array.from(new Set(providedIds.map((id) => id.trim()).filter(Boolean)));
      const invalid = uniqueIds.filter((id) => !isValidExtensionId(id));
      if (invalid.length > 0) {
         throw new Error(
            `Invalid extension id(s): ${invalid.join(', ')}. IDs must match ${CHROME_EXTENSION_ID_REGEX.source}.`,
         );
      }
      return {
         ids: uniqueIds.sort(),
         matched: uniqueIds.map((id) => ({
            id,
            browser: 'manual',
            profile: 'manual',
            name: HOST_APP_INFO.extensionDiscovery.extensionName,
            confidence: 'high',
            reasons: ['manual'],
         })),
         source: 'manual',
      };
   }

   const discoveryEnabled = parseBooleanEnvWithBuildFallback(
      process.env.CALY_OC_EXT_DISCOVERY_ENABLED,
      BUILD_OC_DEFAULTS.extDiscoveryEnabled,
      true,
   );
   const includeKnownIds = parseBooleanEnvWithBuildFallback(
      process.env.CALY_OC_EXT_INCLUDE_KNOWN_IDS,
      BUILD_OC_DEFAULTS.extIncludeKnownIds,
      true,
   );
   const knownIds = HOST_APP_INFO.allowedExtensionIds.filter(isValidExtensionId);

   let discovered: ResolveExtensionIdsResult = { ids: [], matched: [], source: 'discovery:disabled' };
   if (discoveryEnabled) {
      discovered = discoverExtensionIds();
   }

   const idSet = new Set<string>();
   for (const id of discovered.ids) {
      idSet.add(id);
   }
   if (includeKnownIds) {
      for (const id of knownIds) {
         idSet.add(id);
      }
   }

   return {
      ids: Array.from(idSet).sort(),
      matched: discovered.matched,
      source: `${discovered.source}${includeKnownIds ? '+known' : ''}`,
   };
}

function resolveWriteAllBrowserManifests(): boolean {
   return parseBooleanEnv(
      resolveEnvWithBuildFallback(
         process.env.CALY_OC_WRITE_ALL_BROWSER_MANIFESTS,
         BUILD_OC_DEFAULTS.writeAllBrowserManifests,
      ),
      false,
   );
}

export { resolveAllowedExtensionIds, resolveWriteAllBrowserManifests };
export type { ResolveExtensionIdsResult, ExtensionCandidateMatch };
