import { findProjectRoot as findProjectRootInStorage } from '../../node-config-storage';

/**
 * Project root discovery lives with the storage walker so there is exactly one
 * directory-walk implementation. Kept async for existing callers.
 */
async function findProjectRoot(startDir = process.cwd(), sentinel = 'instance.config.json') {
   return findProjectRootInStorage(startDir, sentinel);
}

export { findProjectRoot };
