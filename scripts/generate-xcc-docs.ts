import { writeFileSync, mkdirSync, rmSync, mkdirSync as mkdirSync2 } from 'fs';
import path from 'path';
import { intro, outro, log } from '@clack/prompts';
import stripAnsi from 'strip-ansi';
import { program } from '../src/cli/program';

// Helper to write docs for each command
function writeDocForCommand(cmd, dir = 'docs/commands') {
   const name = cmd._name || cmd.name();
   const help = stripAnsi(cmd.helpInformation());
   mkdirSync(dir, { recursive: true });
   writeFileSync(path.join(dir, `${name}.md`), '```\n' + help.trim() + '\n```');
   return name;
}

async function generateCliDocs() {
   intro('Generating XCC CLI Docs');

   // 1. Clean docs directory
   rmSync('docs', { recursive: true, force: true });
   mkdirSync2('docs', { recursive: true });
   log.step('Cleaned and recreated docs directory.');

   // 2. Generate main help
   const mainHelp = stripAnsi(program.helpInformation());
   writeFileSync('docs/xcc.md', '```\n' + mainHelp.trim() + '\n```');
   log.step('Generated main help.');

   // 3. Generate docs for each command and collect their names
   const commandNames = program.commands.map((cmd) => writeDocForCommand(cmd));
   log.step('Generated docs for each command.');

   // 4. Generate a Table of Contents
   const tocLines = [
      '# XCC CLI Command Reference',
      '',
      'Supercharge your Xano workflow: automate backups, docs, testing, and version control—no AI guesswork, just reliable, transparent dev tools.',
      '',
      '## Table of Contents',
      '',
      '- [xcc - the core commmand](xcc.md)',
      '#### Commands: ',
      ...commandNames.map((name) => `- [${name}](commands/${name}.md)`),
      '',
      'Need further help? Visit https://github.com/MihalyToth20/xano-community-cli or reach out to Mihály Tóth on [State Change](https://statechange.ai/) or [Snappy Community](https://www.skool.com/snappy)',
      '',
   ];
   writeFileSync('docs/README.md', tocLines.join('\n'));
   log.step('Generated Table of Contents.');

   outro('CLI Docs generated successfully.');
}

generateCliDocs();
