import type { ConfigStorage, InstanceConfig, CoreContext, WorkspaceConfig, BranchConfig } from '@repo/types';
import {
    initDB,
    getGlobalConfig,
    setGlobalConfig,
    getInstanceConfig,
    setInstanceConfig,
    getToken,
    setToken,
    getFile,
    setFile,
    deleteFile,
    listFiles,
} from './indexeddb-utils';

interface GlobalConfig {
    currentContext: CoreContext;
    instances: string[];
}

export class BrowserConfigStorage implements ConfigStorage {
    private cachedGlobalConfig: GlobalConfig | null = null;
    private cachedInstanceConfigs: Map<string, InstanceConfig> = new Map();
    async ensureDirs(): Promise<void> {
        // Ensure DB is initialized and load caches
        const db = await initDB();
        // Load global config into cache
        this.cachedGlobalConfig = await getGlobalConfig();
        if (!this.cachedGlobalConfig) {
            this.cachedGlobalConfig = {
                currentContext: { instance: null, workspace: null, branch: null },
                instances: [],
            };
        }
        // Load all instance configs into cache
        const allKeys = await db.getAllKeys('instances');
        const stringKeys = allKeys.filter((key): key is string => typeof key === 'string');
        for (const key of stringKeys) {
            const config = await getInstanceConfig(key);
            if (config) {
                this.cachedInstanceConfigs.set(key, config);
            }
        }
    }

    async loadGlobalConfig(): Promise<GlobalConfig> {
        if (this.cachedGlobalConfig) {
            return this.cachedGlobalConfig;
        }
        const config = await getGlobalConfig();
        if (!config) {
            this.cachedGlobalConfig = {
                currentContext: { instance: null, workspace: null, branch: null },
                instances: [],
            };
        } else {
            this.cachedGlobalConfig = config;
        }
        return this.cachedGlobalConfig;
    }

    async saveGlobalConfig(config: GlobalConfig): Promise<void> {
        await setGlobalConfig(config);
        this.cachedGlobalConfig = config;
    }

    async loadInstanceConfig(instance: string): Promise<InstanceConfig> {
        if (this.cachedInstanceConfigs.has(instance)) {
            return this.cachedInstanceConfigs.get(instance)!;
        }
        const config = await getInstanceConfig(instance);
        if (!config) {
            throw new Error(`Instance config not found: ${instance}`);
        }
        this.cachedInstanceConfigs.set(instance, config);
        return config;
    }

    async saveInstanceConfig(projectRoot: string, config: InstanceConfig): Promise<void> {
        // Use projectRoot as instance key, or config.name if available
        const key = config.name || projectRoot;
        await setInstanceConfig(key, config);
        this.cachedInstanceConfigs.set(key, config);
        // Update instances list in global config
        if (this.cachedGlobalConfig && !this.cachedGlobalConfig.instances.includes(key)) {
            this.cachedGlobalConfig.instances.push(key);
            await setGlobalConfig(this.cachedGlobalConfig);
        }
    }

    async loadToken(instance: string): Promise<string> {
        const token = await getToken(instance);
        if (!token) {
            throw new Error(`Token not found for instance: ${instance}`);
        }
        return token;
    }

    async saveToken(instance: string, token: string): Promise<void> {
        await setToken(instance, token);
    }

    loadMergedConfig(
        startDir: string,
        configFiles?: string[]
    ): {
        mergedConfig: any;
        instanceConfig?: InstanceConfig;
        workspaceConfig?: WorkspaceConfig;
        branchConfig?: BranchConfig;
        foundLevels: { branch?: string; workspace?: string; instance?: string };
    } {
        // In browser, no directory hierarchy, treat startDir as instance name
        const instanceConfig = this.cachedInstanceConfigs.get(startDir);
        if (!instanceConfig) {
            throw new Error(`Instance config not found: ${startDir}`);
        }
        return {
            mergedConfig: instanceConfig,
            instanceConfig,
            foundLevels: { instance: startDir },
        };
    }

    getStartDir(): string {
        // Browser has no start directory concept
        return '';
    }

    async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
        // No-op in browser, virtual directories not supported
    }

    async readdir(path: string): Promise<string[]> {
        // List files under virtual path prefix
        const files = await listFiles(path + '/');
        return files.map(f => f.replace(path + '/', ''));
    }

    async writeFile(path: string, data: string | Uint8Array): Promise<void> {
        const content = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        await setFile(path, content);
    }

    async readFile(path: string): Promise<string | Uint8Array> {
        const content = await getFile(path);
        if (!content) {
            throw new Error(`File not found: ${path}`);
        }
        // Try to decode as string, fallback to Uint8Array
        try {
            return new TextDecoder().decode(content);
        } catch {
            return content;
        }
    }

    async exists(path: string): Promise<boolean> {
        const content = await getFile(path);
        return content !== undefined;
    }

    async streamToFile({
        path,
        stream,
    }: {
        path: string;
        stream: ReadableStream | NodeJS.ReadableStream;
    }): Promise<void> {
        // Convert stream to Uint8Array
        if (stream instanceof ReadableStream) {
            const reader = stream.getReader();
            const chunks: Uint8Array[] = [];
            let done = false;
            while (!done) {
                const { value, done: streamDone } = await reader.read();
                done = streamDone;
                if (value) {
                    chunks.push(value);
                }
            }
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const content = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                content.set(chunk, offset);
                offset += chunk.length;
            }
            await setFile(path, content);
        } else {
            // Node.js stream - not implemented for browser
            throw new Error('Node.js streams not supported in browser');
        }
    }

    async tarExtract(tarGzBuffer: Uint8Array): Promise<{ [filename: string]: Uint8Array | string }> {
        // Use js-untar for browser-compatible tar extraction
        const { untar } = await import('js-untar');
        const files = await untar(tarGzBuffer);
        const result: { [filename: string]: Uint8Array | string } = {};
        for (const file of files) {
            if (file.isFile) {
                // Convert buffer to Uint8Array if needed
                const content = file.buffer instanceof Uint8Array ? file.buffer : new Uint8Array(file.buffer);
                result[file.name] = content;
                // Optionally store in IndexedDB
                await setFile(file.name, content);
            }
        }
        return result;
    }
}