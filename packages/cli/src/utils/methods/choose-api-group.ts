import { select } from '@clack/prompts';
import { metaApiGet } from '@repo/utils';
import { ApiGroup, ChooseApiGroupOrAllOptions } from '@repo/types';

// [ ] CLI
export async function chooseApiGroupOrAll({
   baseUrl,
   token,
   workspace_id,
   branchLabel,
   promptUser = true,
   groupName = null,
   all = false,
}: ChooseApiGroupOrAllOptions): Promise<ApiGroup[]> {
   const apiGroupsResponse = await metaApiGet({
      baseUrl,
      token,
      path: `/workspace/${workspace_id}/apigroup`,
      query: {
         page: 1,
         per_page: 99,
         sort: 'name',
         order: 'asc',
         ...(branchLabel ? { branch: branchLabel } : {}),
      },
   });

   const groups: ApiGroup[] = apiGroupsResponse.items ?? [];

   if (!Array.isArray(groups) || groups.length === 0) {
      throw new Error('No API groups found for this workspace/branch.');
   }

   if (all) return groups;

   if (groupName) {
      const found = groups.find((g) => g.name === groupName);
      if (!found) {
         throw new Error(`API group "${groupName}" not found.`);
      }
      return [found];
   }

   if (promptUser) {
      const chosen = await select({
         message: 'Select an API group:',
         options: groups.map((g) => ({
            value: String(g.id),
            label: g.name,
         })),
      });
      if (!chosen) throw new Error('User cancelled group selection.');
      const selected = groups.find((g) => String(g.id) === String(chosen));
      if (!selected) throw new Error('Selected API group not found.');
      return [selected];
   }

   return [groups[0]];
}
