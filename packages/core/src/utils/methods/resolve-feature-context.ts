import type { BranchConfig, InstanceConfig, WorkspaceConfig } from '@repo/types';
import type { Caly } from '../..';

/**
 * Context configs a caller may have resolved already. Every entry is optional
 * so callers can hand over whatever they have; anything missing is resolved
 * from storage instead of being trusted as complete.
 */
interface FeatureContextConfigs {
   instanceConfig?: InstanceConfig | null;
   workspaceConfig?: WorkspaceConfig | null;
   branchConfig?: BranchConfig | null;
}

type FeatureContextConfigKey = keyof FeatureContextConfigs;

interface FeatureContextNames {
   instance: string;
   workspace: string;
   /** Optional for flows (e.g. restore) that only need instance and workspace. */
   branch?: string;
}

interface ResolvedFeatureContext {
   instanceConfig: InstanceConfig;
   workspaceConfig: WorkspaceConfig;
   branchConfig: BranchConfig;
}

interface ResolveFeatureContextOptions<K extends FeatureContextConfigKey = FeatureContextConfigKey> {
   /** Facade that owns context resolution. */
   core: Pick<Caly, 'loadAndValidateContext' | 'resolveContext'>;
   context: FeatureContextNames;
   startDir: string;
   /** Already-resolved configs. May be partial; missing entries are resolved. */
   contextConfigs?: FeatureContextConfigs;
   /** Configs the caller needs. Defaults to all three. */
   required?: readonly K[];
}

const DEFAULT_REQUIRED_CONFIGS: readonly FeatureContextConfigKey[] = [
   'instanceConfig',
   'workspaceConfig',
   'branchConfig',
];

/**
 * Returns the context configs a feature needs without trusting a partial object.
 *
 * A complete set passes straight through with no storage reads. If a required
 * config is missing, the context is resolved through
 * `core.loadAndValidateContext` when a branch is required, or through
 * `core.resolveContext` for branchless subsets, so downstream code never sees
 * `undefined`.
 */
async function resolveFeatureContext<K extends FeatureContextConfigKey = FeatureContextConfigKey>({
   core,
   context,
   startDir,
   contextConfigs,
   required = DEFAULT_REQUIRED_CONFIGS as readonly K[],
}: ResolveFeatureContextOptions<K>): Promise<Pick<ResolvedFeatureContext, K>> {
   const isComplete = required.every((key) => Boolean(contextConfigs?.[key]));

   if (isComplete) {
      return contextConfigs as Pick<ResolvedFeatureContext, K>;
   }

   // Flows that need a branch must go through the full resolver (it validates
   // the branch belongs to the workspace). Restore only needs instance and
   // workspace, so resolving it with `loadAndValidateContext` would impose a
   // branch requirement it does not have.
   if ((required as readonly FeatureContextConfigKey[]).includes('branchConfig')) {
      return await core.loadAndValidateContext({
         instance: context.instance,
         workspace: context.workspace,
         branch: context.branch,
         startDir,
      });
   }

   const resolution = await core.resolveContext({ context, startDir });
   const picked: Partial<ResolvedFeatureContext> = {};
   const missing: FeatureContextConfigKey[] = [];

   for (const key of required) {
      const value = resolution[key];
      if (!value) {
         missing.push(key);
         continue;
      }
      picked[key] = value as ResolvedFeatureContext[typeof key];
   }

   if (missing.length > 0) {
      throw new Error(
         `Missing context configuration for ${context.instance}/${context.workspace}: ${missing.join(', ')}`
      );
   }

   return picked as Pick<ResolvedFeatureContext, K>;
}

export { resolveFeatureContext, DEFAULT_REQUIRED_CONFIGS };
export type {
   FeatureContextConfigs,
   FeatureContextConfigKey,
   FeatureContextNames,
   ResolvedFeatureContext,
   ResolveFeatureContextOptions,
};
