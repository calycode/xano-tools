import { metaApiGet } from '../../../cli/utils/index';

// [ ] CORE
async function fetchWorkspacesAndBranches({ url, apiKey }) {
   const workspaces = await metaApiGet({ baseUrl: url, token: apiKey, path: '/workspace' });
   for (const ws of workspaces) {
      const branches = await metaApiGet({
         baseUrl: url,
         token: apiKey,
         path: `/workspace/${ws.id}/branch`,
      });
      ws.branches = branches.filter((b) => !b.backup);
   }
   return workspaces;
}

export { fetchWorkspacesAndBranches };
