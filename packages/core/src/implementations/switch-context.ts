import { ConfigStorage, CoreContext } from '@mihalytoth20/xcc-types';

export async function switchContextImplementation(
   storage: ConfigStorage,
   context: CoreContext,
): Promise<void> {
   const config = await storage.loadGlobalConfig();
   config.currentContext = context;
   await storage.saveGlobalConfig(config);
}
