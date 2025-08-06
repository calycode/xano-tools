import os from 'os';
import path from 'path';

const baseDir = path.join(os.homedir(), '.xano-community-cli');
const configPath = path.join(baseDir, 'config.json');
const instancesDir = path.join(baseDir, 'instances');
const tokensDir = path.join(baseDir, 'tokens');

export {
   configPath,
   instancesDir,
   tokensDir,
};
