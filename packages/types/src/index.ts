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
   tokenRef: string;
   workspaces?: WorkspaceConfig[];
   openApiSpec?: {
      output: string;
   };
   codegen?: {
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
      defaultAsserts: AssertDefinition;
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
   value?: any;
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

// -------- ASSERTS ---------- //

export type AssertLevel = 'off' | 'error' | 'warn';

// Keep Level alias for backwards compatibility
type Level = AssertLevel;

export interface AssertOptions {
   key: string;
   fn?: (context: AssertContext) => void;
   level: AssertLevel;
}

export type AssertDefinition = Record<
   string,
   { fn?: (context: AssertContext) => void; level: AssertLevel }
>;

/**
 * Context passed to custom assert functions.
 * Contains the raw response, parsed result, and request metadata.
 */
export interface AssertContext {
   /** The raw fetch Response object */
   requestOutcome: Response;
   /** The parsed response body (JSON object or string) */
   result: any;
   /** HTTP method used for the request */
   method: string;
   /** API endpoint path */
   path: string;
}

// -------- TESTING ---------- //

/**
 * Parameter definition for query/path parameters in test requests.
 *
 * @example
 * ```typescript
 * const param: TestParameter = {
 *   name: 'userId',
 *   in: 'path',
 *   value: '{{ENVIRONMENT.USER_ID}}'
 * };
 * ```
 */
export interface TestParameter {
   /** Parameter name */
   name: string;
   /** Where the parameter appears: path, query, header, or cookie */
   in: 'path' | 'query' | 'header' | 'cookie';
   /** Parameter value - can include {{ENVIRONMENT.KEY}} placeholders */
   value: any;
}

/**
 * Store definition for extracting values from responses into runtime variables.
 *
 * @example
 * ```typescript
 * const store: TestStoreEntry = {
 *   key: 'AUTH_TOKEN',
 *   path: '$.authToken'  // JSONPath expression
 * };
 * ```
 */
export interface TestStoreEntry {
   /** Key name to store the extracted value under */
   key: string;
   /** JSONPath expression to extract value from response (e.g., "$.data.id" or ".authToken") */
   path: string;
}

/**
 * Single test configuration entry for API endpoint testing.
 *
 * @example
 * ```typescript
 * // Basic test
 * const test: TestConfigEntry = {
 *   path: '/users',
 *   method: 'GET',
 *   headers: { 'X-Data-Source': 'live' },
 *   queryParams: [{ name: 'limit', in: 'query', value: '10' }],
 *   requestBody: null,
 *   customAsserts: {}
 * };
 *
 * // Test with runtime value extraction and custom assert
 * const authTest: TestConfigEntry = {
 *   path: '/auth/login',
 *   method: 'POST',
 *   headers: {},
 *   queryParams: null,
 *   requestBody: { email: '{{ENVIRONMENT.TEST_EMAIL}}', password: '{{ENVIRONMENT.TEST_PWD}}' },
 *   store: [{ key: 'AUTH_TOKEN', path: '$.authToken' }],
 *   customAsserts: {
 *     hasToken: {
 *       fn: (ctx) => { if (!ctx.result?.authToken) throw new Error('No token returned'); },
 *       level: 'error'
 *     }
 *   }
 * };
 * ```
 */
export interface TestConfigEntry {
   /** API endpoint path (e.g., "/users", "/auth/login") */
   path: string;
   /** HTTP method */
   method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | string;
   /** Request headers - can include {{ENVIRONMENT.KEY}} placeholders */
   headers: Record<string, string>;
   /** Query/path parameters - null if none */
   queryParams: TestParameter[] | null;
   /** Request body for POST/PUT/PATCH - can include {{ENVIRONMENT.KEY}} placeholders */
   requestBody: any;
   /** Extract values from response to use in subsequent tests */
   store?: TestStoreEntry[];
   /** Custom assertion functions to run against the response */
   customAsserts?: AssertDefinition;
}

/**
 * Complete test configuration - an array of test entries executed in order.
 * Tests run sequentially so extracted runtime values can be used in subsequent tests.
 *
 * @example
 * ```typescript
 * import type { TestConfig } from '@repo/types';
 *
 * const config: TestConfig = [
 *   {
 *     path: '/auth/login',
 *     method: 'POST',
 *     headers: {},
 *     queryParams: null,
 *     requestBody: { email: '{{ENVIRONMENT.TEST_EMAIL}}', password: '{{ENVIRONMENT.TEST_PWD}}' },
 *     store: [{ key: 'AUTH_TOKEN', path: '$.authToken' }],
 *     customAsserts: {}
 *   },
 *   {
 *     path: '/users/me',
 *     method: 'GET',
 *     headers: { 'Authorization': 'Bearer {{ENVIRONMENT.AUTH_TOKEN}}' },
 *     queryParams: null,
 *     requestBody: null,
 *     customAsserts: {}
 *   }
 * ];
 *
 * export default config;
 * ```
 */
export type TestConfig = TestConfigEntry[];

/**
 * Result of a single test execution.
 */
export interface TestResult {
   /** API endpoint path */
   path: string;
   /** HTTP method used */
   method: string;
   /** Whether all assertions passed */
   success: boolean;
   /** Array of assertion errors, or null if none */
   errors: Array<{ key: string; message: string }> | string | null;
   /** Array of assertion warnings, or null if none */
   warnings: Array<{ key: string; message: string }> | null;
   /** Test execution duration in milliseconds */
   duration: number;
}

/**
 * Aggregated test results for an API group.
 */
export interface TestGroupResult {
   /** The API group configuration */
   group: ApiGroupConfig;
   /** Array of test results for this group */
   results: TestResult[];
}

// --------- Registry item types ----------- //
export type RegistryItemType =
   | 'registry:table'
   | 'registry:addon'
   | 'registry:function'
   | 'registry:apigroup'
   | 'registry:query'
   | 'registry:middleware'
   | 'registry:task'
   | 'registry:tool'
   | 'registry:mcp'
   | 'registry:agent'
   | 'registry:realtime'
   | 'registry:workspace/trigger'
   | 'registry:table/trigger'
   | 'registry:mcp/trigger'
   | 'registry:agent/trigger'
   | 'registry:realtime/trigger'
   | 'registry:test'
   | 'registry:snippet'
   | 'registry:file'
   | 'registry:item';

/**
 * Represents a file within a registry item, either external (path-based) or embedded (content-based).
 */
export interface RegistryItemFile {
    path?: string;
    content?: string;
    type: RegistryItemType;
    apiGroupName?: string;
    apiGroupId?: string;
    meta?: Record<string, any>;
}

/**
 * Represents a registry item that can be installed into a Xano instance.
 * Supports hybrid content/file approach: either specify files (external) or content (embedded).
 */
export interface RegistryItem {
   name: string;
   type: RegistryItemType;
   title?: string;
   description?: string;
   docs?: string;
   postInstallHint?: string;
   author?: string;
   registryDependencies?: string[];
   categories?: string[];
   meta?: Record<string, any>;
   // Hybrid approach: either files (for external files) or content (for embedded)
   files?: RegistryItemFile[];
   content?: string;
}

export type InstallUrlParams = {
   instanceConfig: any;
   workspaceConfig: any;
   branchConfig: any;
   file: any;
   apiGroupId?: string;
};

export type UrlMappingFn = (params: InstallUrlParams) => string;

export type InstallResults = {
   installed: Array<{ component: string; file: string; response: any }>;
   failed: Array<{ component: string; file: string; error: string; response?: any }>;
   skipped: Array<{ component: string; file: string; error: string }>;
};
