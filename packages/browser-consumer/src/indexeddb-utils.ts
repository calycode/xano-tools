import { openDB, IDBPDatabase } from 'idb';
import type { CoreContext, InstanceConfig } from '@repo/types';

export interface GlobalConfig {
    currentContext: CoreContext;
    instances: string[];
}

export type Token = string;

export type FileContent = Uint8Array;

interface CalyDBSchema {
    'global-config': {
        key: string;
        value: GlobalConfig;
    };
    'instances': {
        key: string;
        value: InstanceConfig;
    };
    'tokens': {
        key: string;
        value: Token;
    };
    'files': {
        key: string;
        value: FileContent;
    };
}

const DB_NAME = 'caly-browser-config';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CalyDBSchema>> | null = null;

export async function initDB(): Promise<IDBPDatabase<CalyDBSchema>> {
    if (!dbPromise) {
        dbPromise = openDB<CalyDBSchema>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Global config store - single entry
                if (!db.objectStoreNames.contains('global-config')) {
                    db.createObjectStore('global-config');
                }

                // Instances store - keyed by instance name
                if (!db.objectStoreNames.contains('instances')) {
                    db.createObjectStore('instances');
                }

                // Tokens store - keyed by instance name
                if (!db.objectStoreNames.contains('tokens')) {
                    db.createObjectStore('tokens');
                }

                // Files store - keyed by file path
                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files');
                }
            },
        });
    }
    return dbPromise;
}

// Global Config CRUD
export async function getGlobalConfig(): Promise<GlobalConfig | undefined> {
    try {
        const db = await initDB();
        return await db.get('global-config', 'config');
    } catch (error) {
        console.error('Error getting global config:', error);
        throw error;
    }
}

export async function setGlobalConfig(config: GlobalConfig): Promise<void> {
    try {
        const db = await initDB();
        await db.put('global-config', config, 'config');
    } catch (error) {
        console.error('Error setting global config:', error);
        throw error;
    }
}

// Instance Config CRUD
export async function getInstanceConfig(instance: string): Promise<InstanceConfig | undefined> {
    try {
        const db = await initDB();
        return await db.get('instances', instance);
    } catch (error) {
        console.error('Error getting instance config:', error);
        throw error;
    }
}

export async function setInstanceConfig(instance: string, config: InstanceConfig): Promise<void> {
    try {
        const db = await initDB();
        await db.put('instances', config, instance);
    } catch (error) {
        console.error('Error setting instance config:', error);
        throw error;
    }
}

export async function deleteInstanceConfig(instance: string): Promise<void> {
    try {
        const db = await initDB();
        await db.delete('instances', instance);
    } catch (error) {
        console.error('Error deleting instance config:', error);
        throw error;
    }
}

// Token CRUD
export async function getToken(instance: string): Promise<Token | undefined> {
    try {
        const db = await initDB();
        return await db.get('tokens', instance);
    } catch (error) {
        console.error('Error getting token:', error);
        throw error;
    }
}

export async function setToken(instance: string, token: Token): Promise<void> {
    try {
        const db = await initDB();
        await db.put('tokens', token, instance);
    } catch (error) {
        console.error('Error setting token:', error);
        throw error;
    }
}

export async function deleteToken(instance: string): Promise<void> {
    try {
        const db = await initDB();
        await db.delete('tokens', instance);
    } catch (error) {
        console.error('Error deleting token:', error);
        throw error;
    }
}

// File CRUD
export async function getFile(path: string): Promise<FileContent | undefined> {
    try {
        const db = await initDB();
        return await db.get('files', path);
    } catch (error) {
        console.error('Error getting file:', error);
        throw error;
    }
}

export async function setFile(path: string, content: FileContent): Promise<void> {
    try {
        const db = await initDB();
        await db.put('files', content, path);
    } catch (error) {
        console.error('Error setting file:', error);
        throw error;
    }
}

export async function deleteFile(path: string): Promise<void> {
    try {
        const db = await initDB();
        await db.delete('files', path);
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
}

export async function listFiles(prefix?: string): Promise<string[]> {
    try {
        const db = await initDB();
        const keys = await db.getAllKeys('files');
        const stringKeys = keys.filter((key): key is string => typeof key === 'string');
        return prefix ? stringKeys.filter(key => key.startsWith(prefix)) : stringKeys;
    } catch (error) {
        console.error('Error listing files:', error);
        throw error;
    }
}

// Migration support (for future versions)
export async function migrateDB(fromVersion: number, toVersion: number): Promise<void> {
    // Placeholder for migration logic
    console.log(`Migrating DB from ${fromVersion} to ${toVersion}`);
    // Implement migration steps here
}