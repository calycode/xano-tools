import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findProjectRoot } from '../project-root-finder';
import { nodeConfigStorage } from '../../../node-config-storage';

async function writeJson(path: string, value: unknown) {
   await writeFile(path, JSON.stringify(value, null, 2));
}

describe('project root and config walk', () => {
   let root: string;

   beforeEach(async () => {
      root = await mkdtemp(join(tmpdir(), 'caly-context-'));
   });

   afterEach(async () => {
      await rm(root, { recursive: true, force: true });
   });

   it('finds the nearest ancestor containing instance.config.json', async () => {
      const nested = join(root, 'workspace', 'branch', 'deep');
      await mkdir(nested, { recursive: true });
      await writeJson(join(root, 'instance.config.json'), { name: 'prod' });

      await expect(findProjectRoot(nested)).resolves.toBe(root);
   });

   it('throws when no ancestor has the sentinel', async () => {
      await expect(findProjectRoot(root)).rejects.toThrow(
         'Project root not found (missing instance.config.json)'
      );
   });

   it('loads the nearest config level while picking up the ancestor instance', async () => {
      const nested = join(root, 'near');
      await mkdir(nested, { recursive: true });
      await writeJson(join(root, 'instance.config.json'), { name: 'prod', url: 'u' });
      await writeJson(join(nested, 'workspace.config.json'), { id: 1, name: 'near-ws' });
      await writeJson(join(nested, 'branch.config.json'), { id: 2, label: 'near-branch' });

      const merged = await nodeConfigStorage.loadMergedConfig(nested);

      expect(merged.foundLevels).toEqual({
         instance: 'prod',
         workspace: 'near-ws',
         branch: 'near-branch',
      });
      expect(merged.workspaceConfig).toMatchObject({ name: 'near-ws' });
      expect(merged.branchConfig).toMatchObject({ label: 'near-branch' });
   });

   it('prefers the nearest of two sibling levels', async () => {
      const nested = join(root, 'a', 'b');
      await mkdir(nested, { recursive: true });
      await writeJson(join(root, 'a', 'workspace.config.json'), { id: 1, name: 'parent-ws' });
      await writeJson(join(nested, 'workspace.config.json'), { id: 2, name: 'nearest-ws' });

      const merged = await nodeConfigStorage.loadMergedConfig(nested);

      expect(merged.foundLevels.workspace).toBe('nearest-ws');
      expect(merged.workspaceConfig).toMatchObject({ id: 2 });
   });
});
