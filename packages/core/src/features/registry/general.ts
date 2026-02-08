import { RegistryItemFile, RegistryItemType } from '@repo/types';

const typePriority: Record<RegistryItemType, number> = {
    'registry:table': 0,
    'registry:addon': 1,
    'registry:function': 2,
    'registry:apigroup': 3,
    'registry:query': 4,
    'registry:middleware': 5,
    'registry:task': 6,
    'registry:tool': 7,
    'registry:mcp': 8,
    'registry:agent': 9,
    'registry:realtime': 10,
    'registry:workspace/trigger': 11,
    'registry:table/trigger': 12,
    'registry:mcp/trigger': 13,
    'registry:agent/trigger': 14,
    'registry:realtime/trigger': 15,
    'registry:test': 16,
    'registry:snippet': 99,
    'registry:file': 99,
    'registry:item': 99,
};

function sortFilesByType(files: RegistryItemFile[]): RegistryItemFile[] {
    return files.slice().sort((a: RegistryItemFile, b: RegistryItemFile) => {
       const aPriority = typePriority[a.type] ?? 99;
       const bPriority = typePriority[b.type] ?? 99;
       return aPriority - bPriority;
    });
}

// Note: getApiGroupByName is Xano-specific and remains in CLI

export { sortFilesByType };
