import { writeFileSync, mkdirSync, rmSync, cpSync, readFileSync } from 'fs';
import path from 'path';
import stripAnsi from 'strip-ansi';
import { program } from '../packages/cli/src/program';

function copyTemplateFiles(templateDir, targetDir) {
   // Copies everything from templateDir into targetDir, overwriting if needed
   cpSync(templateDir, targetDir, { recursive: true });
   console.log(`Copied template files from ${templateDir} to ${targetDir}.\n`);
}

function writeDocForCommand(cmd, dir = 'docs/commands') {
   const name = cmd.name();
   const description = cmd.description ? cmd.description() : '';
   const help = stripAnsi(cmd.helpInformation());
   const options = cmd.options;
   let optionsContent: string = '';
   if (options) {
      optionsContent = [
         '### Options',
         '',
         ...options.map((opt) => {
            const optionDoc = [`#### ${opt.flags}`, `**Description:** ${opt.description}`].join(
               '\n'
            );
            return optionDoc;
         }),
      ].join('\n');
   }
   mkdirSync(dir, { recursive: true });
   const content = [
      `# ${name}`,
      description && `> #### ${description}\n`,
      '',
      '```sh',
      `xano ${name} [options]`,
      '```',
      optionsContent,
      `\n### ${name} --help`,
      '```sh',
      help.trim(),
      '```',
   ]
      .filter(Boolean)
      .join('\n');
   writeFileSync(path.join(dir, `${name}.md`), content);
   return name;
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

      // 3. Generate docs for each command and collect their names
      const commandNames = program.commands.map((cmd) => writeDocForCommand(cmd));
      console.log('Generated docs for each command.\n ');

      // 4. Generate a Table of Contents

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
   }
}

generateCliDocs();
