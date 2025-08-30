import { CoreContext } from '@calycode/types';
import { installComponentToXano } from '../features/registry';
import type { Caly } from '..';

async function installComponentToXanoImplementation({
   file,
   rawContext,
   core,
}: {
   file: any;
   rawContext: CoreContext;
   core: Caly;
}): Promise<void> {
   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext(
      rawContext
   );

   await installComponentToXano({
      file,
      core,
      resolvedContext: { instanceConfig, workspaceConfig, branchConfig },
   });
}

export { installComponentToXanoImplementation };
