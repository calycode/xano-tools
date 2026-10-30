import { resolveArtifactDestination } from '../resolve-destination';

const context = {
   instance: 'acme',
   workspace: 'main-api',
   branch: 'main',
};

describe('resolveArtifactDestination', () => {
   it('expands the project-root and context placeholders', async () => {
      const destination = await resolveArtifactDestination({
         template: '{@}/output/repo/{instance}/{workspace}/{branch}',
         context,
         projectRoot: '/project',
      });

      expect(destination).toBe('/project/output/repo/acme/main-api/main');
   });

   it('expands the normalized API group placeholder', async () => {
      const destination = await resolveArtifactDestination({
         template: '{@}/output/spec/{instance}/{workspace}/{branch}/{api_group_normalized_name}',
         context: { ...context, apiGroupNormalized: 'users-v2' },
         projectRoot: '/project',
      });

      expect(destination).toBe('/project/output/spec/acme/main-api/main/users-v2');
   });

   it('uses an explicit override verbatim without needing a project root', async () => {
      const destination = await resolveArtifactDestination({
         template: '{@}/output/repo/{instance}',
         context,
         override: './custom-output',
      });

      expect(destination).toBe('./custom-output');
   });

   it('matches placeholder keys case-insensitively', async () => {
      const destination = await resolveArtifactDestination({
         template: '{@}/{Instance}/{WORKSPACE}/{branch}',
         context,
         projectRoot: '/project',
      });

      expect(destination).toBe('/project/acme/main-api/main');
   });
});
