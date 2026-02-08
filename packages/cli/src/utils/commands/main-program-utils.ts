import { font } from '../methods/font';

function isDeprecated(cmd) {
   const desc = cmd.description ? cmd.description() : '';
   return desc.trim().startsWith('[DEPRECATED]');
}

/**
 * Checks if a command is hidden via Commander.js's .hideHelp() method.
 * When .hideHelp() is called on a command, Commander sets cmd._hidden = true.
 */
function isHidden(cmd) {
   return cmd._hidden === true;
}

/**
 * Checks if a command should be hidden from the root help only.
 * These commands are still visible in their parent's help.
 * Set via: cmd._hideFromRootHelp = true
 */
function isHiddenFromRootHelp(cmd) {
   return cmd._hideFromRootHelp === true;
}

function getFullCommandPath(cmd) {
   const path = [];
   let current = cmd;
   while (current && current.name && current.name()) {
      path.push(current.name());
      current = current.parent;
   }
   // Remove 'xano' or '' from the path if present
   return path
      .reverse()
      .filter((seg) => seg && seg !== 'xano')
      .join(' ');
}

function collectVisibleLeafCommands(cmd, parentPath = [], parentHiddenFromRoot = false) {
   const path = [...parentPath, cmd.name()].filter((segment) => segment !== 'xano');
   let results = [];

   // Track if this command or any ancestor is hidden from root help
   const hiddenFromRoot = parentHiddenFromRoot || isHiddenFromRootHelp(cmd);

   // Only include if not deprecated, not hidden, not hidden from root help (including ancestors), and not the root
   if (cmd.name() && !isDeprecated(cmd) && !isHidden(cmd) && !hiddenFromRoot) {
      // If no subcommands, it's a leaf
      if (!cmd.commands || cmd.commands.length === 0) {
         results.push({
            command: cmd,
            path,
            description: cmd.description ? cmd.description() : '',
         });
      }
   }

   // Skip recursing into hidden commands - their subcommands should also be hidden
   if (isHidden(cmd)) {
      return results;
   }

   // Recurse into subcommands, passing along the hiddenFromRoot state
   if (cmd.commands && cmd.commands.length > 0) {
      for (const sub of cmd.commands) {
         results = results.concat(collectVisibleLeafCommands(sub, path, hiddenFromRoot));
      }
   }
   return results;
}

function customFormatHelp(cmd, helper) {
   let output = [];

   // 1. Description
   if (cmd.description()) {
      output.push(cmd.description());
   }
   output.push('');

   // 2. Usage
   output.push(font.color.gray(`Usage: ${helper.commandUsage(cmd)}`));
   output.push('');

   // 3. Arguments (if any)
   const argList = helper.visibleArguments(cmd);
   if (argList.length) {
      output.push(font.combo.boldCyan('Arguments:'));
      const longestArg = argList.reduce((max, arg) => Math.max(max, arg.name().length), 0);
      const pad = (str, len) => str + ' '.repeat(Math.max(0, len - str.length));

      for (let i = 0; i < argList.length; i++) {
         const arg = argList[i];
         const isLast = i === argList.length - 1;
         const prefix = isLast ? '  └─' : '  ├─';
         const desc = arg.description || '';
         output.push(
            `${font.color.gray(prefix)} ${font.color.yellowBright(pad(arg.name(), longestArg))}  ${font.color.gray(desc)}`,
         );
      }
      output.push('');
   }

   // 4. Options
   const optionsList = helper.visibleOptions(cmd);
   if (optionsList.length) {
      output.push(font.combo.boldCyan('Options:'));
      const longestFlag = optionsList.reduce((max, opt) => Math.max(max, opt.flags.length), 0);
      const pad = (str, len) => str + ' '.repeat(Math.max(0, len - str.length));

      for (let i = 0; i < optionsList.length; i++) {
         const opt = optionsList[i];
         const isLast = i === optionsList.length - 1;
         const prefix = isLast ? '  └─' : '  ├─';
         output.push(
            `${font.color.gray(prefix)} ${font.color.cyan(pad(opt.flags, longestFlag))}  ${font.color.gray(opt.description || '')}`,
         );
      }
      output.push('');
   }

   // 5. Subcommands with tree structure
   const subcommands = helper.visibleCommands(cmd);
   if (subcommands.length) {
      output.push(font.combo.boldCyan('Commands:'));
      const longestName = subcommands.reduce((max, sub) => Math.max(max, sub.name().length), 0);
      const pad = (str, len) => str + ' '.repeat(Math.max(0, len - str.length));

      for (let i = 0; i < subcommands.length; i++) {
         const sub = subcommands[i];
         const isLast = i === subcommands.length - 1;
         const prefix = isLast ? '  └─' : '  ├─';
         const desc = sub.description ? sub.description() : '';
         // Truncate long descriptions for compact display
         const shortDesc = desc.length > 60 ? desc.substring(0, 57) + '...' : desc;
         output.push(
            `${font.color.gray(prefix)} ${font.color.yellowBright(pad(sub.name(), longestName))}  ${font.color.gray(shortDesc)}`,
         );
      }
      output.push('');
   }

   // 6. Footer
   output.push(font.color.gray("Run 'xano <command> --help' for detailed usage."));
   output.push(
      font.color.gray('https://github.com/calycode/xano-tools | https://links.calycode.com/discord'),
   );

   return output.join('\n');
}

// Short descriptions for compact help display
const shortDescriptions: Record<string, string> = {
   init: 'Initialize CLI with Xano instance config',
   'oc init': 'Initialize OpenCode host integration',
   'oc serve': 'Serve OpenCode AI server locally',
   'oc templates install': 'Install OpenCode agent templates',
   'test run': 'Run API test suite via OpenAPI spec',
   'generate codegen': 'Create library from OpenAPI spec',
   'generate docs': 'Generate documentation suite',
   'generate repo': 'Process workspace into repo structure',
   'generate spec': 'Generate OpenAPI spec(s)',
   'registry add': 'Add prebuilt component to Xano',
   'registry scaffold': 'Scaffold registry folder',
   'serve spec': 'Serve OpenAPI spec locally',
   'serve registry': 'Serve registry locally',
   'backup export': 'Export workspace backup',
   'backup restore': 'Restore backup to workspace',
};

function customFormatHelpForRoot(cmd) {
   // 1. Collect all visible leaf commands with their full paths
   const allLeafCmds = collectVisibleLeafCommands(cmd);

   // 2. For alignment: determine the longest command path string
   const allNames = allLeafCmds.map((c) => c.path.join(' '));
   const longestName = allNames.reduce((len, n) => Math.max(len, n.length), 0);
   const pad = (str, len) => str + ' '.repeat(len - str.length);

   // 3. Define your desired groups (with full string paths)
   const groups = [
      {
         title: 'Core',
         commands: ['init'],
      },
      {
         title: 'Agentic Development',
         commands: ['oc init', 'oc serve', 'oc templates install'],
      },
      {
         title: 'Testing',
         commands: ['test run'],
      },
      {
         title: 'Generate',
         commands: ['generate codegen', 'generate docs', 'generate repo', 'generate spec'],
      },
      {
         title: 'Registry',
         commands: ['registry add', 'registry scaffold'],
      },
      {
         title: 'Serve',
         commands: ['serve spec', 'serve registry'],
      },
      {
         title: 'Backups',
         commands: ['backup export', 'backup restore'],
      },
   ];

   // 4. Map full path strings to command objects
   const cmdMap = Object.fromEntries(allLeafCmds.map((c) => [c.path.join(' '), c]));

   // 5. Track which commands are used
   const used = new Set(groups.flatMap((g) => g.commands));
   const ungrouped = allLeafCmds.map((c) => c.path.join(' ')).filter((name) => !used.has(name));

   if (ungrouped.length) {
      groups.push({
         title: 'Other',
         commands: ungrouped,
      });
   }

   // 6. Build output
   let output = [];

   // Header with description
   if (cmd.description()) {
      output.push(cmd.description());
   }
   output.push('');
   output.push(font.color.gray('Usage: xano <command> [options]'));
   output.push('');

   // 7. Command Groups with tree structure
   for (let groupIdx = 0; groupIdx < groups.length; groupIdx++) {
      const group = groups[groupIdx];
      const validCommands = group.commands.filter((cname) => cmdMap[cname]);

      if (validCommands.length === 0) continue;

      output.push(font.combo.boldCyan(`${group.title}:`));

      for (let cmdIdx = 0; cmdIdx < validCommands.length; cmdIdx++) {
         const cname = validCommands[cmdIdx];
         const c = cmdMap[cname];
         const isLast = cmdIdx === validCommands.length - 1;
         const prefix = isLast ? '  └─' : '  ├─';
         const shortDesc = shortDescriptions[cname] || c.description;

         output.push(
            `${font.color.gray(prefix)} ${font.color.yellowBright(pad(cname, longestName))}  ${font.color.gray(shortDesc)}`,
         );
      }
      output.push('');
   }

   // Footer
   output.push(font.color.gray("Run 'xano <command> --help' for detailed usage."));
   output.push(
      font.color.gray('https://github.com/calycode/xano-tools | https://links.calycode.com/discord'),
   );

   return output.join('\n');
}

function applyCustomHelpToAllCommands(cmd) {
   if (cmd.parent === null) {
      cmd.configureHelp({ formatHelp: customFormatHelpForRoot });
   } else {
      cmd.configureHelp({ formatHelp: customFormatHelp });
   }

   if (cmd.commands && cmd.commands.length > 0) {
      for (const sub of cmd.commands) {
         applyCustomHelpToAllCommands(sub);
      }
   }
}

/**
 * Marks a command as hidden from root help only.
 * The command will still be visible in its parent's help output.
 * Usage: hideFromRootHelp(cmd.command('my-command'))
 */
function hideFromRootHelp(cmd) {
   cmd._hideFromRootHelp = true;
   return cmd; // Allow chaining
}

export { getFullCommandPath, applyCustomHelpToAllCommands, hideFromRootHelp };
