// ---- Context Types ----

export interface Context {
   instance?: string | null;
   workspace?: string | null;
   branch?: string | null;
   apigroup?: string | null;
}

export interface InstanceConfig {
   name: string;
   url: string;
   tokenFile: string;
   workspaces?: WorkspaceConfig[];
   // ... other fields
}

export interface WorkspaceConfig {
   id: string;
   name: string;
   description: string;
   branch: string;
   branches?: BranchConfig[];
   apigroups?: ApiGroupConfig[];
}

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
