import { ConfigStorage, CoreContext } from '../../types';

export async function switchContextImplementation(
   storage: ConfigStorage,
   context: CoreContext,
): Promise<void> {
   const config = await storage.loadGlobalConfig();
   config.currentContext = context;
   await storage.saveGlobalConfig(config);
}
