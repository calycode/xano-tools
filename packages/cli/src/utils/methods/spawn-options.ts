/**
 * Build child_process spawn options for the current platform.
 *
 * @param stdio - Standard I/O handling mode
 * @param shell - Whether the command is a shell script that needs a shell
 *                (`.cmd`/`.bat`/`npx` on Windows)
 * @param extraEnv - Additional environment variables merged over process.env
 * @param cwd - Working directory for the child process
 */
export function getSpawnOptions(
   stdio: 'inherit' | 'pipe' | 'ignore' = 'inherit',
   shell: boolean = false,
   extraEnv?: Record<string, string>,
   cwd?: string,
) {
   return {
      stdio,
      shell,
      cwd,
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
   };
}
