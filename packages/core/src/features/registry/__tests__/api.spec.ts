import { getRegistryIndex, getRegistryItem, fetchRegistryFileContent, clearRegistryCache } from '../api';

// Mock fetch globally
global.fetch = jest.fn();

describe('Registry API', () => {
    const mockRegistryUrl = 'https://example.com/registry';

    beforeEach(() => {
        jest.clearAllMocks();
        clearRegistryCache();
    });

    describe('getRegistryIndex', () => {
        it('should fetch and return the registry index', async () => {
            const mockIndex = { items: ['item1', 'item2'] };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockIndex),
            });

            const result = await getRegistryIndex(mockRegistryUrl);

            expect(global.fetch).toHaveBeenCalledWith(`${mockRegistryUrl}/index.json`);
            expect(result).toEqual(mockIndex);
        });

        it('should throw error on fetch failure', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
            });

            await expect(getRegistryIndex(mockRegistryUrl)).rejects.toThrow('Failed to fetch index.json: 404');
        });
    });

    describe('getRegistryItem', () => {
        it('should fetch and return a registry item', async () => {
            const mockItem = { name: 'test-item', type: 'registry:function' };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockItem),
            });

            const result = await getRegistryItem('test-item', mockRegistryUrl);

            expect(global.fetch).toHaveBeenCalledWith(`${mockRegistryUrl}/test-item.json`);
            expect(result).toEqual(mockItem);
        });

        it('should normalize leading slashes', async () => {
            const mockItem = { name: 'test-item' };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockItem),
            });

            await getRegistryItem('/test-item', mockRegistryUrl);

            expect(global.fetch).toHaveBeenCalledWith(`${mockRegistryUrl}/test-item.json`);
        });
    });

    describe('fetchRegistryFileContent', () => {
        it('should return inline content if available', async () => {
            const item = { content: 'inline content' };
            const result = await fetchRegistryFileContent(item, 'path/file.js', mockRegistryUrl);

            expect(result).toBe('inline content');
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should fetch file content from URL if no inline content', async () => {
            const item = {};
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('fetched content'),
            });

            const result = await fetchRegistryFileContent(item, 'path/file.js', mockRegistryUrl);

            expect(global.fetch).toHaveBeenCalledWith(`${mockRegistryUrl}/path/file.js`);
            expect(result).toBe('fetched content');
        });

        it('should normalize leading slashes in file path', async () => {
            const item = {};
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('content'),
            });

            await fetchRegistryFileContent(item, '/path/file.js', mockRegistryUrl);

            expect(global.fetch).toHaveBeenCalledWith(`${mockRegistryUrl}/path/file.js`);
        });
    });
});