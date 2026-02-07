import { BrowserConfigStorage } from '../browser-config-storage';
import { initDB } from '../indexeddb-utils';

describe('BrowserConfigStorage', () => {
    let storage: BrowserConfigStorage;

    beforeEach(async () => {
        storage = new BrowserConfigStorage();
        // Clear DB for each test
        const db = await initDB();
        await db.clear('global-config');
        await db.clear('instances');
        await db.clear('tokens');
        await db.clear('files');
    });

    describe('ensureDirs', () => {
        it('should initialize DB and load caches', async () => {
            await storage.ensureDirs();
            // Should not throw
        });
    });

    describe('loadGlobalConfig', () => {
        it('should return default config when none exists', async () => {
            const config = await storage.loadGlobalConfig();
            expect(config).toEqual({
                currentContext: { instance: null, workspace: null, branch: null },
                instances: [],
            });
        });
    });

    describe('saveGlobalConfig and loadGlobalConfig', () => {
        it('should save and load global config', async () => {
            const testConfig = {
                currentContext: { instance: 'test-instance', workspace: 'main', branch: 'master' },
                instances: ['test-instance'],
            };
            await storage.saveGlobalConfig(testConfig);
            const loaded = await storage.loadGlobalConfig();
            expect(loaded).toEqual(testConfig);
        });
    });

    describe('saveInstanceConfig and loadInstanceConfig', () => {
        it('should save and load instance config', async () => {
            const testConfig = {
                name: 'test-instance',
                url: 'https://test.xano.io',
                tokenRef: 'test-token',
                workspaces: [],
                backups: { output: './backups' },
                openApiSpec: { output: './openapi' },
                codegen: { output: './codegen' },
                registry: { output: './registry' },
                process: { output: './process' },
                lint: { output: './lint', rules: {} },
                test: { output: './test', headers: {}, defaultAsserts: {} },
                xanoscript: { output: './xanoscript' },
            };
            await storage.saveInstanceConfig('test-instance', testConfig);
            const loaded = await storage.loadInstanceConfig('test-instance');
            expect(loaded).toEqual(testConfig);
        });
    });

    describe('saveToken and loadToken', () => {
        it('should save and load token', async () => {
            await storage.saveToken('test-instance', 'test-token');
            const loaded = await storage.loadToken('test-instance');
            expect(loaded).toBe('test-token');
        });
    });

    describe('loadMergedConfig', () => {
        it('should return merged config for instance', async () => {
            const testConfig = {
                name: 'test-instance',
                url: 'https://test.xano.io',
                tokenRef: 'test-token',
                workspaces: [],
                backups: { output: './backups' },
            };
            await storage.saveInstanceConfig('test-instance', testConfig);
            await storage.ensureDirs(); // Load caches
            const result = storage.loadMergedConfig('test-instance');
            expect(result.mergedConfig).toEqual(testConfig);
            expect(result.instanceConfig).toEqual(testConfig);
            expect(result.foundLevels).toEqual({ instance: 'test-instance' });
        });
    });

    describe('getStartDir', () => {
        it('should return empty string', () => {
            expect(storage.getStartDir()).toBe('');
        });
    });

    describe('writeFile and readFile', () => {
        it('should write and read file', async () => {
            const content = 'test content';
            await storage.writeFile('test.txt', content);
            const readContent = await storage.readFile('test.txt');
            expect(readContent).toBe(content);
        });

        it('should write and read binary file', async () => {
            const content = new Uint8Array([1, 2, 3, 4]);
            await storage.writeFile('test.bin', content);
            const readContent = await storage.readFile('test.bin');
            expect(readContent).toEqual(content);
        });
    });

    describe('exists', () => {
        it('should return true for existing file', async () => {
            await storage.writeFile('test.txt', 'content');
            const exists = await storage.exists('test.txt');
            expect(exists).toBe(true);
        });

        it('should return false for non-existing file', async () => {
            const exists = await storage.exists('nonexistent.txt');
            expect(exists).toBe(false);
        });
    });

    describe('readdir', () => {
        it('should list files in directory', async () => {
            await storage.writeFile('dir/file1.txt', 'content1');
            await storage.writeFile('dir/file2.txt', 'content2');
            await storage.writeFile('other.txt', 'content3');
            const files = await storage.readdir('dir/');
            expect(files).toEqual(['file1.txt', 'file2.txt']);
        });
    });

    // TODO: Add tests for tarExtract, streamToFile when possible
});