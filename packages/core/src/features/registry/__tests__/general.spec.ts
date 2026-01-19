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
});