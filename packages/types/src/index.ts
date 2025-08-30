// Barrel exports:

// Export config storage abstraction interface.
export * from './storage';
export * from './events';

// ---- Context Types ----
/**
 * Core context specification for basic Xano operations.
 * Defines the fundamental targeting information for instance, workspace, and branch.
 *
 * @example
 * ```typescript
 * const coreContext: CoreContext = {
 *   instance: 'production',
 *   workspace: 'main',
 *   branch: 'master'
 * };
 * ```
 */
export interface CoreContext {
   instance?: string | null;
   workspace?: string | null;
   branch?: string | null;
}

/**
 * Extended context specification for Xano operations including API group targeting.
 * Defines the complete operational context for CLI commands.
 *
 * @example
 * ```typescript
 * // Full context specification
 * const context: Context = {
 *   instance: 'production',
 *   workspace: 'main',
 *   branch: 'master',
 *   apigroup: 'user-api'
 * };
 *
 * // Partial context (inherits current values for unspecified fields)
 * const partialContext: Context = {
 *   branch: 'develop',
 *   apigroup: 'admin-api'
 * };
 * ```
 */
export interface Context extends CoreContext {
   apigroup?: string | null;
}

/**
 * Configuration for a Xano instance containing connection details and feature settings.
 * Represents a complete Xano deployment with its associated workspaces and tool configurations.
 *
 * @example
 * ```typescript
 * const instanceConfig: InstanceConfig = {
 *   name: 'production',
 *   url: 'https://x123.xano.io',
 *   tokenFile: 'production.token',
 *   workspaces: [
 *     { id: '456', name: 'main', description: 'Main workspace', branch: 'master' }
 *   ],
 *   backups: { output: './backups' },
 *   openApiSpec: { output: './openapi' }
 * };
 * ```
 */
export interface InstanceConfig {
   name: string;
   url: string;
   tokenFile: string;
   workspaces?: WorkspaceConfig[];
   openApiSpec?: {
      output: string;
   };
   registry?: {
      output: string;
   };
   backups: {
      output: string;
   };
   process?: {
      output: string;
   };
   lint?: {
      output: string;
      rules: Record<string, 'error' | 'warn' | 'off'>;
   };
   test?: {
      output: string;
      headers: Record<string, string>;
      defaultAsserts: Record<string, 'error' | 'warn' | 'off'>;
   };
   xanoscript?: {
      output: string;
   };
}

/**
 * Configuration for a Xano workspace containing its metadata and associated resources.
 * Workspaces are logical containers for related API groups, database schemas, and branches.
 *
 * @example
 * ```typescript
 * const workspaceConfig: WorkspaceConfig = {
 *   id: '456',
 *   name: 'main',
 *   description: 'Main application workspace',
 *   branch: 'master',
 *   branches: [
 *     { label: 'master', live: true },
 *     { label: 'develop', backup: true }
 *   ],
 *   apigroups: [
 *     { id: '789', name: 'user-api' },
 *     { id: '101', name: 'admin-api' }
 *   ]
 * };
 * ```
 */
export interface WorkspaceConfig {
   id: string;
   name: string;
   description: string;
   branch: string;
   branches?: BranchConfig[];
   apigroups?: ApiGroupConfig[];
}

/**
 * Configuration for a Xano workspace branch with deployment and backup settings.
 * Branches allow for parallel development and testing of API changes.
 *
 * @example
 * ```typescript
 * const branchConfig: BranchConfig = {
 *   label: 'master',
 *   live: true,
 *   backup: true,
 *   created_at: '2024-01-15T10:30:00Z'
 * };
 *
 * const devBranch: BranchConfig = {
 *   label: 'develop',
 *   live: false,
 *   backup: false
 * };
 * ```
 */
export interface BranchConfig {
   label: string;
   backup?: boolean;
   live?: boolean;
   created_at?: string;
}

export interface ApiGroupConfig {
   id: string | number;
   name: string;
   [key: string]: any; // Optional: for extensibility
}

// Alias for backwards compatibility
export type ApiGroup = ApiGroupConfig;

export interface CurrentContextConfig {
   instanceConfig: InstanceConfig | null;
   workspaceConfig: WorkspaceConfig | null;
   branchConfig: BranchConfig | null;
   apigroupConfig: ApiGroupConfig | null;
}

// ---- API Request Types ----

export type PathParams = Record<string, string | number>;
export type QueryParams = Record<string, string | number | boolean | undefined>;
export type Headers = Record<string, string>;
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface MetaApiRequestOptions {
   baseUrl: string;
   token: string;
   method?: HTTPMethod;
   path?: string;
   pathParams?: PathParams;
   query?: QueryParams;
   body?: unknown;
   headers?: Headers;
   allowError?: boolean;
}

export type MetaApiRequestBlobOptions = Omit<MetaApiRequestOptions, 'allowError'>;

// ---- CLI/Utility Types ----

export interface ChooseApiGroupOrAllOptions {
   baseUrl: string;
   token: string;
   workspace_id: string | number;
   branchLabel?: string;
   promptUser?: boolean;
   groupName?: string | null;
   all?: boolean;
}

export interface FetchAndExtractYamlArgs {
   baseUrl: string;
   token: string;
   workspaceId: string | number;
   branchLabel: string;
   outDir: string;
   core: any;
}

// ---- Schema Types ----

export interface Schema {
   type?: string;
   enum?: unknown[];
   properties?: Record<string, Schema>;
   items?: Schema;
   default?: unknown;
   example?: unknown;
   description?: string;
   [key: string]: unknown;
}

// Alias for backwards compatibility
export type TableSchemaItem = Schema;

// ---- OpenAPI Parameter Types ----

type ParamLocation = 'path' | 'query' | 'header' | 'cookie';

interface Parameter {
   name: string;
   in: ParamLocation;
   schema?: Schema;
   example?: unknown;
   default?: unknown;
}

// ---- Request Preparation Types ----

export interface PrepareRequestArgs {
   baseUrl: string;
   path: string;
   method: string;
   headers?: Record<string, string>;
   parameters?: Parameter[];
   body?: Schema;
}

export interface PreparedRequest {
   url: string;
   method: string;
   headers: Record<string, string>;
   body?: string;
}

// ---- Sanitize Utility Options ----

export type SanitizeOptions = {
   normalizeUnicode?: boolean; // NFKD normalization (default: true)
   removeDiacritics?: boolean; // (default: true)
   allowedCharsRegex?: RegExp; // (default: /a-zA-Z0-9_-/)
   replacementChar?: string; // (default: '-')
   collapseRepeats?: boolean; // (default: true)
   trimReplacement?: boolean; // (default: true)
   toLowerCase?: boolean; // (default: true)
};
