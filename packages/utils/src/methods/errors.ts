/**
 * Brand stored on {@link NoDirectoryTreeError}. `Symbol.for` keeps the brand
 * identical across bundles, so a storage implementation bundled separately from
 * Core is still recognized by {@link isNoDirectoryTreeError}.
 */
const NO_DIRECTORY_TREE = Symbol.for('caly.no-directory-tree');

/**
 * Signals that a `ConfigStorage` has no config tree to walk (the browser, for
 * example). Context resolution treats it as an empty tree and falls back to the
 * global `currentContext`; every other read error is surfaced to the caller.
 */
export class NoDirectoryTreeError extends Error {
   constructor(message = 'This storage has no directory tree to walk') {
      super(message);
      this.name = 'NoDirectoryTreeError';
      Object.defineProperty(this, NO_DIRECTORY_TREE, { value: true });
   }
}

/**
 * Type guard for {@link NoDirectoryTreeError} that also survives bundling, where
 * the storage and Core can each hold their own copy of the class.
 */
export function isNoDirectoryTreeError(error: unknown): error is NoDirectoryTreeError {
   if (error instanceof NoDirectoryTreeError) {
      return true;
   }
   return (
      typeof error === 'object' &&
      error !== null &&
      (error as Record<symbol, unknown>)[NO_DIRECTORY_TREE] === true
   );
}
