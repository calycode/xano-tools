import { ConfigStorage, CoreContext } from '@calycode/types';

export async function switchContextImplementation(
   storage: ConfigStorage,
   context: CoreContext
): Promise<void> {
   const config = await storage.loadGlobalConfig();
   config.currentContext = context;
   await storage.saveGlobalConfig(config);
   // keep local config in sync
   await storage.saveLocalInstanceConfig('', context);
}
