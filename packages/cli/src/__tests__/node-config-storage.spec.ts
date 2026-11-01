import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The storage resolves ~/.xano-tools at import time, so point homedir at a
// per-test temp directory and re-require the module after setting it.
jest.mock('node:os', () => ({
   ...jest.requireActual('node:os'),
   homedir: () => (globalThis as any).__CALY_TEST_HOME__,
}));

type NodeConfigStorage = typeof import('../node-config-storage');

async function writeJson(path: string, value: unknown) {
   await writeFile(path, JSON.stringify(value, null, 2));
}

async function readJson(path: string) {
   return JSON.parse(await readFile(path, 'utf-8'));
}

describe('nodeConfigStorage instance configs', () => {
   let home: string;
   let previousCwd: string;
   let storage: NodeConfigStorage['nodeConfigStorage'];

   beforeEach(async () => {
      home = await mkdtemp(join(tmpdir(), 'caly-home-'));
      (globalThis as any).__CALY_TEST_HOME__ = home;
      jest.resetModules();
      ({ nodeConfigStorage: storage } = await import('../node-config-storage'));
      previousCwd = process.cwd();
   });

   afterEach(async () => {
      process.chdir(previousCwd);
      delete (globalThis as any).__CALY_TEST_HOME__;
      await rm(home, { recursive: true, force: true });
   });

   it('loads a named instance even when the cwd has a same-named directory', async () => {
      const instancesDir = join(home, '.xano-tools', 'instances');
      await mkdir(instancesDir, { recursive: true });
      const staging = { name: 'staging', url: 'https://staging.xano.io' };
      await writeJson(join(instancesDir, 'staging.json'), staging);

      const project = join(home, 'project');
      await mkdir(join(project, 'staging'), { recursive: true });
      await writeJson(join(project, 'instance.config.json'), {
         name: 'local',
         url: 'https://local.xano.io',
      });
      process.chdir(project);

      await expect(storage.loadInstanceConfig('staging')).resolves.toEqual(staging);
   });

   it('rejects a named instance file whose declared name does not match', async () => {
      const instancesDir = join(home, '.xano-tools', 'instances');
      await mkdir(instancesDir, { recursive: true });
      await writeJson(join(instancesDir, 'staging.json'), {
         name: 'production',
         url: 'https://prod.xano.io',
      });

      await expect(storage.loadInstanceConfig('staging')).rejects.toThrow(
         /declares "production"/
      );
   });

   it('falls back to the local config when no instance name is given', async () => {
      const project = join(home, 'project');
      await mkdir(project, { recursive: true });
      const local = { name: 'local', url: 'https://local.xano.io' };
      await writeJson(join(project, 'instance.config.json'), local);
      process.chdir(project);

      await expect((storage.loadInstanceConfig as any)()).resolves.toEqual(local);
   });

   it('throws for an unknown instance instead of returning the local config', async () => {
      const project = join(home, 'project');
      await mkdir(project, { recursive: true });
      await writeJson(join(project, 'instance.config.json'), {
         name: 'local',
         url: 'https://local.xano.io',
      });
      process.chdir(project);

      await expect(storage.loadInstanceConfig('missing')).rejects.toThrow(
         'Instance config not found: missing'
      );
   });

   it('rejects an invalid instance name before writing the local config', async () => {
      const project = join(home, 'project');
      await mkdir(project, { recursive: true });
      const configPath = join(project, 'instance.config.json');
      const original = { name: 'prod', url: 'https://prod.xano.io' };
      await writeJson(configPath, original);

      await expect(
         storage.saveInstanceConfig(project, {
            ...original,
            name: 'prod/foo',
         } as any)
      ).rejects.toThrow('Invalid instance name');

      await expect(readJson(configPath)).resolves.toEqual(original);
   });
});
