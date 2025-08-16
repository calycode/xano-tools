import { program } from '../src/program.js';
import { writeFileSync, mkdirSync, rm, mkdir } from 'fs';
import stripAnsi from 'strip-ansi';

function writeDocForCommand(cmd, dir = 'docs/commands') {
   const name = cmd._name || cmd.name();
   const help = stripAnsi(cmd.helpInformation());
   mkdirSync(dir, { recursive: true });
   writeFileSync(`${dir}/${name}.md`, '```\n' + help.trim() + '\n```');
   return name;
}

// Generate main help
const mainHelp = stripAnsi(program.helpInformation());
mkdirSync('docs', { recursive: true });
writeFileSync('docs/cli.md', '```\n' + mainHelp.trim() + '\n```');

// Generate docs for each command and collect their names
const commandNames = program.commands.map((cmd) => writeDocForCommand(cmd));

// Generate a Table of Contents
const tocLines = [
   '# XCC CLI Command Reference',
   '',
   '## Table of Contents',
   '',
   '- [Main Help](cli.md)',
   ...commandNames.map((name) => `- [${name}](commands/${name}.md)`),
   '',
];

async function generateCliDocs() {
   await rm('docs', { recursive: true, force: true });
   await mkdir('docs', { recursive: true });
   writeFileSync('docs/README.md', tocLines.join('\n'));
}

generateCliDocs();
