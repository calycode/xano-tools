import { font } from '../methods/font';

function isDeprecated(cmd) {
   const desc = cmd.description ? cmd.description() : '';
   return desc.trim().startsWith('[DEPRECATED]');
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

   // Only include if not deprecated and not the root (which has empty name)
   if (cmd.name() && !isDeprecated(cmd)) {
      // If no subcommands, it's a leaf
      if (!cmd.commands || cmd.commands.length === 0) {
         results.push({
            command: cmd,
            path,
            description: cmd.description ? cmd.description() : '',
         });
      }
   }
   // Always recurse into subcommands (even if parent is a leaf, just in case)
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
            `  ${font.color.yellowBright(arg.name())}` + `\n    ${arg.description || ''}\n`
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
         title: font.combo.boldCyan('Core Commands:'),
         commands: ['init'],
      },
      {
         title: font.combo.boldCyan('Generation Commands:'),
         commands: ['generate codegen', 'generate docs', 'generate repo', 'generate spec'],
      },
      {
         title: font.combo.boldCyan('Registry:'),
         commands: ['registry add', 'registry scaffold'],
      },
      {
         title: font.combo.boldCyan('Serve:'),
         commands: ['serve spec', 'serve registry'],
      },
      {
         title: font.combo.boldCyan('Backups:'),
         commands: ['backup export', 'backup restore'],
      },
      {
         title: font.combo.boldCyan('Testing & Linting:'),
         commands: ['test run'],
      },
   ];

   // 4. Map full path strings to command objects
   const cmdMap = Object.fromEntries(allLeafCmds.map((c) => [c.path.join(' '), c]));

   // 5. Track which commands are used
   const used = new Set(groups.flatMap((g) => g.commands));
   const ungrouped = allLeafCmds.map((c) => c.path.join(' ')).filter((name) => !used.has(name));

   if (ungrouped.length) {
      groups.push({
         title: font.combo.boldCyan('Other:'),
         commands: ungrouped,
      });
   }

   // 6. Usage line
   let output = [font.weight.bold(`\nUsage: xano <command> [options]\n`)];

   // Banner and description
   if (cmd.description()) {
      output.push(cmd.description() + '\n');
   }

   // Options
   output.push(font.weight.bold('Options:'));
   output.push(
      `  -v, --version   ${font.color.gray('output the version number')}\n` +
         `  -h, --help      ${font.color.gray('display help for command')}\n`
   );

   // 7. Command Groups
   for (const group of groups) {
      output.push('\n' + group.title);
      for (const cname of group.commands) {
         const c = cmdMap[cname];
         if (c) {
            const opts = '  ' + font.color.gray('-h, --help');
            output.push(
               `   ${font.weight.bold(
                  font.color.yellowBright(pad(cname, longestName))
               )}${opts}\n      ${c.description}\n`
            );
         }
      }
   }

   // Footer/help link
   output.push(
      font.color.gray(
         'Need help? Visit https://github.com/calycode/xano-tools or reach out to us on https://links.calycode.com/discord\n'
      )
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
