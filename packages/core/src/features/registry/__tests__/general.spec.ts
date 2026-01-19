import { sortFilesByType } from '../general';

describe('sortFilesByType', () => {
    it('should sort files by type priority', () => {
        const files = [
            { type: 'registry:function', name: 'func' },
            { type: 'registry:table', name: 'table' },
            { type: 'registry:addon', name: 'addon' },
        ];

        const sorted = sortFilesByType(files);

        expect(sorted).toEqual([
            { type: 'registry:table', name: 'table' },
            { type: 'registry:addon', name: 'addon' },
            { type: 'registry:function', name: 'func' },
        ]);
    });

    it('should handle unknown types with low priority', () => {
        const files = [
            { type: 'registry:unknown', name: 'unknown' },
            { type: 'registry:table', name: 'table' },
        ];

        const sorted = sortFilesByType(files);

        expect(sorted[0]).toEqual({ type: 'registry:table', name: 'table' });
        expect(sorted[1]).toEqual({ type: 'registry:unknown', name: 'unknown' });
    });
});