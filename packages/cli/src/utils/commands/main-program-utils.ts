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

function collectVisibleLeafCommands(cmd, parentPath = []) {
   const path = [...parentPath, cmd.name()].filter((segment) => segment !== 'xano');
   let results = [];

   // Only include if not deprecated, not hidden, and not the root (which has empty name)
   if (cmd.name() && !isDeprecated(cmd) && !isHidden(cmd)) {
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

   // Recurse into subcommands (even if parent is a leaf, just in case)
   if (cmd.commands && cmd.commands.length > 0) {
      for (const sub of cmd.commands) {
         results = results.concat(collectVisibleLeafCommands(sub, path));
      }
   }
   return results;
}

function customFormatHelp(cmd, helper) {
   // 1. Banner and Description
   let output = [];
   if (cmd.description()) {
      output.push(font.weight.bold(cmd.description()));
   }

   // 2. Usage
   output.push(font.weight.bold(`\nUsage: ${helper.commandUsage(cmd)}\n`));

   // 3. Arguments
   const argList = helper.visibleArguments(cmd);
   if (argList.length) {
      output.push(font.weight.bold('Arguments:'));
      for (const arg of argList) {
         output.push(
            `  ${font.color.yellowBright(arg.name())}` + `\n    ${arg.description || ''}\n`,
         );
      }
   }

   // 4. Options
   const optionsList = helper.visibleOptions(cmd);
   if (optionsList.length) {
      output.push(font.weight.bold('Options:'));
      for (const opt of optionsList) {
         output.push(`  ${font.color.cyan(opt.flags)}` + `\n    ${opt.description || ''}\n`);
      }
   }

   // 5. Subcommands
   const subcommands = helper.visibleCommands(cmd);
   if (subcommands.length) {
      output.push(font.weight.bold('Commands:'));
      for (const sub of subcommands) {
         output.push(`  ${font.color.green(sub.name())}` + `\n    ${sub.description() || ''}\n`);
      }
   }

   // 6. Footer
   output.push(font.color.gray('\nNeed help? Visit https://github.com/calycode/xano-tools\n'));
   return output.join('\n');
}

// Short descriptions for compact help display
const shortDescriptions: Record<string, string> = {
   init: 'Initialize CLI with Xano instance config',
   'oc init': 'Initialize OpenCode host integration',
   'oc serve': 'Serve OpenCode AI server locally',
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
         title: 'AI Integration',
         commands: ['oc init', 'oc serve'],
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

   // 7. Command Groups - compact format
   for (const group of groups) {
      output.push(font.combo.boldCyan(`${group.title}:`));
      for (const cname of group.commands) {
         const c = cmdMap[cname];
         if (c) {
            const shortDesc = shortDescriptions[cname] || c.description;
            output.push(
               `  ${font.color.yellowBright(pad(cname, longestName))}  ${font.color.gray(shortDesc)}`,
            );
         }
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

export { getFullCommandPath, applyCustomHelpToAllCommands };
