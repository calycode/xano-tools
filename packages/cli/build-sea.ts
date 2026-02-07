import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync, chmodSync } from 'fs';
import { resolve, join } from 'path';

// This script follows the Node.js SEA documentation to create a single executable application
// https://nodejs.org/api/single-executable-applications.html

const DIST_DIR = resolve('dist');
const EXES_DIR = join(DIST_DIR, 'exes');

// Ensure directories exist
if (!existsSync(EXES_DIR)) {
  mkdirSync(EXES_DIR, { recursive: true });
}

// 1. Generate the blob
console.log('Generating SEA blob...');
execSync('node --experimental-sea-config sea-config.json', { stdio: 'inherit' });

// 2. Determine the source node executable
const nodeExecutable = process.execPath;
console.log(`Using Node.js executable: ${nodeExecutable}`);

// 3. Create the target executable name (platform dependent)
const platform = process.platform;
const targetName = platform === 'win32' ? 'caly.exe' : 'caly';
const targetPath = join(EXES_DIR, targetName);

// 4. Copy the node executable
console.log(`Copying Node.js binary to ${targetPath}...`);
copyFileSync(nodeExecutable, targetPath);

// 5. Remove the signature on macOS/Linux (if present) to allow injection
if (platform === 'darwin') {
    console.log('Removing code signature from binary (macOS)...');
    try {
        execSync(`codesign --remove-signature "${targetPath}"`, { stdio: 'inherit' });
    } catch (e) {
        console.warn('Failed to remove signature, continuing anyway...');
    }
}

// 6. Inject the blob into the executable using postject
// npx postject <executable> <sea-blob> --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
console.log('Injecting SEA blob...');
const blobPath = join(DIST_DIR, 'sea-prep.blob');
const sentinelFuse = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

// Use local npx/postject from node_modules
try {
    // Inject the blob
    // For macOS, we might need --macho-segment-name NODE_SEA (default)
    const cmd = `npx postject "${targetPath}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse ${sentinelFuse} ${platform === 'darwin' ? '--macho-segment-name NODE_SEA' : ''}`;
    console.log(`Executing: ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
} catch (error) {
    console.error('Failed to inject blob:', error);
    process.exit(1);
}

// 7. Sign the binary (macOS only) - optional but recommended for local testing without warnings
if (platform === 'darwin') {
    console.log('Resigning binary (macOS)...');
    try {
         execSync(`codesign --sign - "${targetPath}"`, { stdio: 'inherit' });
    } catch (e) {
         console.warn('Failed to resign binary:', e);
    }
}

console.log(`\nSuccess! Single Executable Application created at:`);
console.log(targetPath);
