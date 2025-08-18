import { select, log } from '@clack/prompts';
import { metaApiGet } from '../index';

export async function chooseApiGroupOrAll({
   baseUrl,
   token,
   workspace_id,
   branchLabel,
   promptUser = true,
   groupName = null,
   all = false,
}) {
   // Fetch API groups for this workspace/branch
   const apiGroupsResponse = await metaApiGet({
      baseUrl,
      token,
      path: `/workspace/${workspace_id}/apigroup`,
      query: {
        page: 1,
        per_page: 99,
        sort: "name",
        order: "asc",
         ...(branchLabel ? { branch: branchLabel } : {}),
      }
   });

   const groups = apiGroupsResponse.items ?? [];

   if (!Array.isArray(groups) || groups.length === 0) {
      log.error('No API groups found for this workspace/branch.');
      process.exit(1);
   }

   if (all) return groups;

   // If groupName provided, find it
   if (groupName) {
      const found = groups.find((g) => g.name === groupName);
      if (!found) {
         log.error(`API group "${groupName}" not found.`);
         process.exit(1);
      }
      return [found];
   }
   // Otherwise, prompt user
   if (promptUser) {
      const chosen = await select({
         message: 'Select an API group:',
         options: groups.map((g) => ({
            value: g.id,
            label: g.name,
         })),
      });
      return [groups.find((g) => g.id == chosen)];
   }
   return [];
}
