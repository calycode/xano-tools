import { sortFilesByType } from '../general';
import type { RegistryItemType } from '@repo/types';

describe('sortFilesByType', () => {
    it('should sort files by type priority', () => {
        const files: { type: RegistryItemType; path: string }[] = [
            { type: 'registry:function', path: 'func' },
            { type: 'registry:table', path: 'table' },
            { type: 'registry:addon', path: 'addon' },
        ];

        const sorted = sortFilesByType(files);

        expect(sorted).toEqual([
            { type: 'registry:table', path: 'table' },
            { type: 'registry:addon', path: 'addon' },
            { type: 'registry:function', path: 'func' },
        ]);
    });

    it('should handle unknown types with low priority', () => {
        const files: { type: RegistryItemType; path: string }[] = [
            { type: 'registry:unknown' as RegistryItemType, path: 'unknown' },
            { type: 'registry:table', path: 'table' },
        ];

        const sorted = sortFilesByType(files);

        expect(sorted[0]).toEqual({ type: 'registry:table', path: 'table' });
        expect(sorted[1]).toEqual({ type: 'registry:unknown', path: 'unknown' });
    });

    it('orders the full type set from registry:table (0) to registry:test (16)', () => {
        const ordered: RegistryItemType[] = [
            'registry:table',
            'registry:addon',
            'registry:function',
            'registry:apigroup',
            'registry:query',
            'registry:middleware',
            'registry:task',
            'registry:tool',
            'registry:mcp',
            'registry:agent',
            'registry:realtime',
            'registry:workspace/trigger',
            'registry:table/trigger',
            'registry:mcp/trigger',
            'registry:agent/trigger',
            'registry:realtime/trigger',
            'registry:test',
        ];
        const shuffled = [...ordered]
            .reverse()
            .map((type, i) => ({ type, path: String(i) }));

        expect(sortFilesByType(shuffled).map((f) => f.type)).toEqual(ordered);
    });

    it('sorts snippet/file/item after all known types', () => {
        const files: { type: RegistryItemType; path: string }[] = [
            { type: 'registry:snippet', path: 's' },
            { type: 'registry:item', path: 'i' },
            { type: 'registry:test', path: 't' },
            { type: 'registry:file', path: 'f' },
        ];

        const sorted = sortFilesByType(files).map((f) => f.type);

        expect(sorted[0]).toBe('registry:test');
        expect(sorted.slice(1).sort()).toEqual([
            'registry:file',
            'registry:item',
            'registry:snippet',
        ]);
    });
});