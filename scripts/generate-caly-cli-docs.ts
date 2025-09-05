import { writeFileSync, mkdirSync, rmSync, mkdirSync as mkdirSync2 } from 'fs';
import path from 'path';
import stripAnsi from 'strip-ansi';
import { program } from '../packages/cli/src/program';

// Helper to write docs for each command
function writeDocForCommand(cmd, dir = 'docs/commands') {
   const name = cmd._name || cmd.name();
   const help = stripAnsi(cmd.helpInformation());
   mkdirSync(dir, { recursive: true });
   writeFileSync(path.join(dir, `${name}.md`), '```\n' + help.trim() + '\n```');
   return name;
}

async function generateCliDocs() {
   console.log('Generating Caly-Xano CLI Docs');

   // 1. Clean docs directory
   rmSync('docs', { recursive: true, force: true });
   mkdirSync2('docs', { recursive: true });
   console.log('Cleaned and recreated docs directory.');

   // 2. Generate main help
   const mainHelp = stripAnsi(program.helpInformation());
   writeFileSync('docs/xano.md', '```\n' + mainHelp.trim() + '\n```');
   console.log('Generated main help.');

   // 3. Generate docs for each command and collect their names
   const commandNames = program.commands.map((cmd) => writeDocForCommand(cmd));
   console.log('Generated docs for each command.');

   // 4. Generate a Table of Contents
   const tocLines = [
      '# Caly-Xano CLI Command Reference',
      '',
      'Supercharge your Xano workflow: automate backups, docs, testing, and version control—no AI guesswork, just reliable, transparent dev tools.',
      '',
      '## Table of Contents',
      '',
      '- [xano - the core commmand](xano.md)',
      '#### Commands: ',
      ...commandNames.map((name) => `- [${name}](commands/${name}.md)`),
      '',
      'Need further help? Visit https://github.com/calycode/xano-tools or reach out to Mihály Tóth on [State Change](https://statechange.ai/) or [Snappy Community](https://www.skool.com/@mihaly-toth-2040?g=snappy)',
      '',
   ];
   writeFileSync('docs/README.md', tocLines.join('\n'));
   console.log('Generated Table of Contents.');

   console.log('CLI Docs generated successfully.');
}

generateCliDocs();
