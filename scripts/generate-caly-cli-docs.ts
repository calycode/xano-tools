import { writeFileSync, mkdirSync, rmSync, cpSync, readFileSync } from 'fs';
import path from 'path';
import stripAnsi from 'strip-ansi';
import { program } from '../packages/cli/src/program';

const DOCS_DIR = 'docs/commands';

function copyTemplateFiles(templateDir: string, targetDir: string) {
   cpSync(templateDir, targetDir, { recursive: true });
   console.log(`Copied template files from ${templateDir} to ${targetDir}.\n`);
}

function isDeprecated(cmd: any) {
   const desc = cmd.description ? cmd.description() : '';
   return desc.trim().startsWith('[DEPRECATED]');
}

// Recursively traverse commands, skipping deprecated, and generate docs for each
function walkCommands(cmd: any, parentNames: string[] = [], sidebarLines: string[] = []) {
   if (isDeprecated(cmd)) return;

   const nameParts = [...parentNames, cmd.name()];
   const docPath = path.join(DOCS_DIR, nameParts.join('-') + '.md');
   const relDocPath = 'commands/' + nameParts.join('-') + '.md';

   writeDocForCommand(cmd, docPath, nameParts);

   // For sidebar: skip commands with subcommands (we'll show their subs instead)
   if (cmd.commands && cmd.commands.length > 0) {
      // Section title for namespace
      sidebarLines.push(`- ${'  '.repeat(parentNames.length)}**${cmd.name()}**`);
      cmd.commands.forEach((subCmd: any) => walkCommands(subCmd, nameParts, sidebarLines));
   } else {
      // Leaf command
      sidebarLines.push(
         `\n${'  '.repeat(parentNames.length)}- [${nameParts.join(' ')}](${relDocPath})`
      );
   }
}

function writeDocForCommand(cmd: any, docPath: string, nameParts: string[]) {
   const name = nameParts.join(' ');
   const description = cmd.description ? cmd.description() : '';
   const help = stripAnsi(cmd.helpInformation());
   const options = cmd.options;
   let optionsContent = '';
   if (options && options.length > 0) {
      optionsContent = [
         '### Options',
         '',
         ...options.map((opt: any) => `#### ${opt.flags}\n**Description:** ${opt.description}`),
      ].join('\n');
   }
   mkdirSync(path.dirname(docPath), { recursive: true });
   const content = [
      `# ${name}`,
      description && `>[!NOTE|label:Description]\n> #### ${description}\n`,
      '',
      '```term',
      `$ xano ${name} [options]`,
      '```',
      optionsContent,
      `\n### ${name} --help`,
      `\`\`\`term\n$ xano ${name} --help`,
      help.trim(),
      '```',
   ]
      .filter(Boolean)
      .join('\n');
   writeFileSync(docPath, content);
}

function generateCliDocs() {
   try {
      console.log('Generating Caly-Xano CLI Docs \n');

      // 1. Clean docs directory
      rmSync('docs', { recursive: true, force: true });
      mkdirSync('docs', { recursive: true });

      // 1.1. Copy default template files:
      copyTemplateFiles('util-resources/docs-template', 'docs');
      console.log('Cleaned and recreated docs directory. \n');

      // 2. Generate main help
      const mainHelp = stripAnsi(program.helpInformation());
      writeFileSync(
         'docs/xano.md',
         ['# @calycode/cli', '```sh', mainHelp.trim(), '```', ''].join('\n')
      );
      console.log('Generated main help. \n');

      // 3. Recursively generate docs and sidebar
      const sidebarLines = ['- [xano - the core command](xano.md)', '- **Commands**'];
      program.commands.forEach((cmd) => walkCommands(cmd, [], sidebarLines));
      const finalSidebar = [
         ...sidebarLines,
         `
-  Changelog

   -  [CLI](https://github.com/calycode/xano-tools/blob/main/packages/cli/CHANGELOG.md)
   -  [CORE](https://github.com/calycode/xano-tools/blob/main/packages/core/CHANGELOG.md)

-  Community

   -  [calycode on Discord](https://links.calycode.com/discord)

<small>For devs with 💖 by devs at [calycode](https://calycode.com).</small>

<small>Documentation powered by [Docsify.js](https://docsifyjs.org)</small>
      `,
      ];
      writeFileSync('docs/_sidebar.md', finalSidebar.join('\n'));

      // 4. Generate README as before
      const mainReadmeContent = readFileSync('README.md', 'utf-8');
      const tocLines = [
         '# @calycode/cli Docs',
         '',
         'Supercharge your Xano workflow: automate backups, docs, testing, and version control—no AI guesswork, just reliable, transparent dev tools.',
         '',
         mainReadmeContent,
         '',
         'Need further help? Visit [GitHub](https://github.com/calycode/xano-tools) or reach out to Mihály Tóth on [State Change](https://statechange.ai/) or [Snappy Community](https://www.skool.com/@mihaly-toth-2040?g=snappy)',
      ];
      writeFileSync('docs/README.md', tocLines.join('\n'));
      console.log('Generated Table of Contents. \n');

      console.log('CLI Docs generated successfully. \n');
   } catch (err) {
      console.error('Error generating CLI docs:', err);
      process.exit(1);
   } finally {
      process.exit(0);
   }
}

generateCliDocs();
