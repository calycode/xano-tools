/**
 * Attach shared context options to a Commander command.
 * @param {Command} cmd - The commander command object
 * @returns {Command} - The same command for chaining
 */
export function addFullContextOptions(cmd) {
   return cmd
      .option(
         '-i, --instance <instance>',
         'The instance name. This is used to fetch the instance configuration. The value provided at the setup command.'
      )
      .option(
         '-w, --workspace <workspace>',
         'The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.'
      )
      .option(
         '-b, --branch <branch>',
         'The branch name. This is used to select the branch configuration. Same as on Xano Interface.'
      );
}

/**
 * Attach shared context options to a Commander command.
 * @param {Command} cmd - The commander command object
 * @returns {Command} - The same command for chaining
 */
export function addPartialContextOptions(cmd) {
   return cmd
      .option(
         '-i, --instance <instance>',
         'The instance name. This is used to fetch the instance configuration. The value provided at the setup command.'
      )
      .option(
         '-w, --workspace <workspace>',
         'The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.'
      );
}

// You can also define other reusable option sets:
export function addApiGroupOptions(cmd) {
   return cmd
      .option('-g, --group <name>', 'API group name. Same as on Xano Interface.')
      .option(
         '-A, --all',
         'Regenerate for all API groups in the workspace / branch of the current context.'
      );
}

export function addPrintOutputFlag(cmd) {
   return cmd.option('--print-output-dir', 'Expose usable output path for further reuse.');
}
