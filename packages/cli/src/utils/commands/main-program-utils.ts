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
   const isDeprecated = (c) => c.description && c.description().trim().startsWith('[DEPRECATED]');
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

export { getFullCommandPath, collectVisibleLeafCommands };
