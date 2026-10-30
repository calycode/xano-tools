import type {
   ApiGroupConfig,
   BranchConfig,
   ConfigStorage,
   Context,
   CurrentContextConfig,
   InstanceConfig,
   WorkspaceConfig,
} from '@repo/types';

/**
 * The single owner of context resolution.
 *
 * Precedence, highest first:
 *   1. explicit flags (`--instance`, `--workspace`, `--branch`, `--group`)
 *   2. the nearest config level found walking up from `startDir`
 *   3. the global `currentContext` written by `init` / `switchContext`
 *
 * A resolution happens in two stages so callers can prompt for missing fields
 * without walking the tree twice: `loadContextInputs` performs the (single)
 * directory walk and global read, `deriveContext` is the pure-ish derivation
 * over those inputs (it only reads an explicitly selected instance config).
 */

const DEFAULT_CONFIG_FILES = ['branch.config.json', 'workspace.config.json', 'instance.config.json'];

const DEFAULT_REQUIRED_FIELDS: ContextField[] = ['instance', 'workspace', 'branch'];

type FoundLevels = { branch?: string; workspace?: string; instance?: string };

type ContextField = 'instance' | 'workspace' | 'branch' | 'apigroup';

interface ContextInputs {
   mergedConfig: any;
   instanceConfig: InstanceConfig | null;
   workspaceConfig: WorkspaceConfig | null;
   branchConfig: BranchConfig | null;
   foundLevels: FoundLevels;
   globalContext: Context;
   /** Set when the storage has no directory tree to walk (e.g. the browser). */
   treeReadError?: unknown;
}

interface ContextResolution extends CurrentContextConfig {
   /** Resolved context names (ids are normalized to names/labels). */
   context: Context;
   mergedConfig: any;
   foundLevels: FoundLevels;
   /** Fields that could not be resolved from any level. */
   missing(requiredFields?: ContextField[]): ContextField[];
}

function firstDefined<T>(...values: (T | null | undefined)[]): T | null {
   for (const value of values) {
      if (value !== null && value !== undefined) {
         return value;
      }
   }
   return null;
}

/** Find a workspace by id or name. */
function findWorkspaceConfig(
   instanceConfig: InstanceConfig | null,
   workspace: unknown
): WorkspaceConfig | null {
   if (!instanceConfig?.workspaces || workspace == null) {
      return null;
   }
   return (
      (instanceConfig.workspaces as any[]).find(
         (ws) => String(ws.id) === String(workspace) || ws.name === workspace
      ) ?? null
   );
}

/** Find a branch by label or id. */
function findBranchConfig(
   workspaceConfig: WorkspaceConfig | null,
   branch: unknown
): BranchConfig | null {
   if (!workspaceConfig?.branches || branch == null) {
      return null;
   }
   return (
      workspaceConfig.branches.find(
         (b) => b.label === branch || String((b as any).id) === String(branch)
      ) ?? null
   );
}

/** Find an API group by id or name. */
function findApiGroupConfig(
   workspaceConfig: WorkspaceConfig | null,
   apigroup: unknown
): ApiGroupConfig | null {
   if (!workspaceConfig?.apigroups || apigroup == null) {
      return null;
   }
   return (
      (workspaceConfig.apigroups as any[]).find(
         (g) => String(g.id) === String(apigroup) || g.name === apigroup
      ) ?? null
   );
}

function matchesWorkspace(config: WorkspaceConfig | null, ref: unknown): boolean {
   if (!config || ref == null) {
      return false;
   }
   return String(config.id) === String(ref) || config.name === ref;
}

function matchesBranch(config: BranchConfig | null, ref: unknown): boolean {
   if (!config || ref == null) {
      return false;
   }
   return config.label === ref || String((config as any).id) === String(ref);
}

/**
 * Reads every input a resolution needs exactly once: the nearest config level,
 * and the global config. The tree read is optional — storages without a
 * directory hierarchy (browser) throw and are treated as an empty tree.
 */
async function loadContextInputs({
   storage,
   startDir,
   configFiles = DEFAULT_CONFIG_FILES,
}: {
   storage: ConfigStorage;
   startDir?: string;
   configFiles?: string[];
}): Promise<ContextInputs> {
   let mergedConfig: any = {};
   let instanceConfig: InstanceConfig | null = null;
   let workspaceConfig: WorkspaceConfig | null = null;
   let branchConfig: BranchConfig | null = null;
   let foundLevels: FoundLevels = {};
   let treeReadError: unknown;

   try {
      const loaded = await storage.loadMergedConfig(
         startDir ?? storage.getStartDir(),
         configFiles
      );
      mergedConfig = loaded?.mergedConfig ?? {};
      instanceConfig = loaded?.instanceConfig ?? null;
      workspaceConfig = loaded?.workspaceConfig ?? null;
      branchConfig = loaded?.branchConfig ?? null;
      foundLevels = loaded?.foundLevels ?? {};
   } catch (error) {
      treeReadError = error;
   }

   const globalConfig = await storage.loadGlobalConfig();

   return {
      mergedConfig,
      instanceConfig,
      workspaceConfig,
      branchConfig,
      foundLevels,
      globalContext: globalConfig?.currentContext ?? {},
      treeReadError,
   };
}

/**
 * Derives `{ instanceConfig, workspaceConfig, branchConfig, apigroupConfig }`
 * from already-loaded inputs. Precedence is applied per field, so a flag can
 * override only the branch while workspace/instance still come from files.
 *
 * When the resolved instance differs from the one found in the tree, the
 * selected instance config is loaded through the storage seam. `--instance`
 * therefore actually switches instance config; an unknown explicit instance is
 * an error instead of silently reusing the nearest one.
 */
async function deriveContext({
   storage,
   inputs,
   context = {},
}: {
   storage: ConfigStorage;
   inputs: ContextInputs;
   context?: Context;
}): Promise<ContextResolution> {
   const instanceName = firstDefined(
      context.instance,
      inputs.foundLevels.instance,
      inputs.globalContext.instance
   );

   let instanceConfig = inputs.instanceConfig;
   if (instanceName != null && (!instanceConfig || String(instanceConfig.name) !== String(instanceName))) {
      try {
         instanceConfig = await storage.loadInstanceConfig(String(instanceName));
      } catch {
         if (context.instance != null) {
            throw new Error(
               `Instance config not found for "${instanceName}". Run 'caly-xano init --name ${instanceName}' first.`
            );
         }
         instanceConfig = null;
      }
   }

   // Tree-level workspace/branch only belong to the tree's instance. After an
   // explicit instance switch they must not leak into the new instance.
   const treeApplies =
      instanceName == null ||
      inputs.instanceConfig == null ||
      String(inputs.instanceConfig.name) === String(instanceName);

   // The global currentContext belongs to a specific instance; do not leak its
   // workspace/branch into an explicitly different instance.
   const globalApplies =
      instanceName == null ||
      inputs.globalContext.instance == null ||
      String(inputs.globalContext.instance) === String(instanceName);

   const workspaceName = firstDefined(
      context.workspace,
      treeApplies ? inputs.foundLevels.workspace : null,
      globalApplies ? inputs.globalContext.workspace : null
   );
   const branchName = firstDefined(
      context.branch,
      treeApplies ? inputs.foundLevels.branch : null,
      globalApplies ? inputs.globalContext.branch : null
   );

   let workspaceConfig = findWorkspaceConfig(instanceConfig, workspaceName);
   if (!workspaceConfig && treeApplies && matchesWorkspace(inputs.workspaceConfig, workspaceName)) {
      workspaceConfig = inputs.workspaceConfig;
   }

   // Fall back to the first branch when only a workspace is known (e.g.
   // backups, which require instance + workspace but not branch). An explicit
   // branch that cannot be found stays null rather than resolving to another.
   let branchConfig =
      branchName == null
         ? workspaceConfig?.branches?.[0] ?? null
         : findBranchConfig(workspaceConfig, branchName);
   if (!branchConfig && treeApplies && matchesBranch(inputs.branchConfig, branchName)) {
      branchConfig = inputs.branchConfig;
   }

   const apigroupConfig = findApiGroupConfig(workspaceConfig, context.apigroup);

   const resolvedContext: Context = {
      instance: instanceConfig?.name ?? instanceName ?? null,
      workspace: workspaceConfig?.name ?? workspaceName ?? null,
      branch: branchConfig?.label ?? branchName ?? null,
      apigroup: apigroupConfig?.name ?? context.apigroup ?? null,
   };

   return {
      context: resolvedContext,
      instanceConfig: instanceConfig ?? null,
      workspaceConfig,
      branchConfig,
      apigroupConfig,
      mergedConfig: inputs.mergedConfig,
      foundLevels: inputs.foundLevels,
      missing(requiredFields: ContextField[] = DEFAULT_REQUIRED_FIELDS) {
         return requiredFields.filter((field) => resolvedContext[field] == null);
      },
   };
}

/** Convenience wrapper: read inputs once, then derive. */
async function resolveContext({
   storage,
   context = {},
   startDir,
   configFiles,
}: {
   storage: ConfigStorage;
   context?: Context;
   startDir?: string;
   configFiles?: string[];
}): Promise<ContextResolution> {
   const inputs = await loadContextInputs({ storage, startDir, configFiles });
   return deriveContext({ storage, inputs, context });
}

/** Throws when a required field is missing. */
function assertContext(
   resolution: ContextResolution,
   requiredFields: ContextField[] = DEFAULT_REQUIRED_FIELDS,
   message?: string
): void {
   const missing = resolution.missing(requiredFields);
   if (missing.length > 0) {
      throw new Error(message ?? `Missing context: ${missing.join(', ')}`);
   }
}

export {
   DEFAULT_CONFIG_FILES,
   DEFAULT_REQUIRED_FIELDS,
   assertContext,
   deriveContext,
   findApiGroupConfig,
   findBranchConfig,
   findWorkspaceConfig,
   loadContextInputs,
   resolveContext,
};
export type { ContextField, ContextInputs, ContextResolution, FoundLevels };
