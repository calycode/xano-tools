import { writeFileSync, mkdirSync, rmSync, cpSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import stripAnsi from 'strip-ansi';
import { program } from '../packages/cli/src/program';

const DOCS_DIR = 'docs';
const COMMANDS_DIR = path.join(DOCS_DIR, 'commands');
const TEMPLATE_DIR = 'util-resources/docs-template';

type DocSource = 'generated' | 'guide' | 'overview';

interface ManifestEntry {
   section: string;
   path: string;
   title: string;
   group: string | null;
   parent: string | null;
   order: number;
   source: DocSource;
   /** The command words or a single file slug, used to build the sidebar tree. */
   segments: string[];
   /** Markdown file relative to `docs/` that backs this entry. */
   file: string;
}

interface ManifestLink {
   section: string;
   title: string;
   href: string;
}

interface Manifest {
   version: number;
   generatedAt: string;
   entries: ManifestEntry[];
   links: ManifestLink[];
}

function copyTemplateFiles(templateDir: string, targetDir: string) {
   cpSync(templateDir, targetDir, { recursive: true });
   console.log(`Copied template files from ${templateDir} to ${targetDir}.\n`);
}

function isDeprecated(cmd: any) {
   const desc = cmd.description ? cmd.description() : '';
   return desc.trim().startsWith('[DEPRECATED]');
}

function toTitleCase(slug: string) {
   return slug
      .replace(/\.md$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** The first markdown `# heading`, used as a page title for hand-written docs. */
function firstHeading(markdown: string, fallback: string) {
   const line = markdown.split(/\r?\n/).find((l) => /^#\s+/.test(l));
   return line ? line.replace(/^#\s+/, '').trim() : fallback;
}

/**
 * Recursively traverse commands, skipping deprecated, and generate docs for each.
 * The manifest is the structured counterpart of the docsify sidebar: `segments` carries the
 * full command path so the static sidebar can nest it to any depth.
 */
function walkCommand(cmd: any, parentNames: string[], entries: ManifestEntry[]) {
   if (isDeprecated(cmd)) return;

   const nameParts = [...parentNames, cmd.name()];
   const slug = nameParts.join('-');
   const docPath = path.join(COMMANDS_DIR, slug + '.md');

   writeDocForCommand(cmd, docPath, nameParts);

   const hasSubcommands = Boolean(cmd.commands && cmd.commands.length > 0);
   entries.push({
      section: 'Commands',
      path: 'commands/' + slug,
      title: nameParts.join(' '),
      group: parentNames.length >= 1 ? parentNames[parentNames.length - 1] : null,
      parent: parentNames.length >= 2 ? parentNames[0] : null,
      order: entries.length,
      source: 'generated',
      segments: nameParts,
      file: 'commands/' + slug + '.md',
   });

   if (hasSubcommands) {
      cmd.commands.forEach((subCmd: any) => walkCommand(subCmd, nameParts, entries));
   }
}

/** The generated docsify sidebar, preserved for the legacy docsify deployment. */
function buildLegacySidebar(cmd: any, parentNames: string[], sidebarLines: string[]) {
   if (isDeprecated(cmd)) return;

   const nameParts = [...parentNames, cmd.name()];
   const relDocPath = 'commands/' + nameParts.join('-') + '.md';

   if (cmd.commands && cmd.commands.length > 0) {
      sidebarLines.push(`- ${'  '.repeat(parentNames.length)}**${cmd.name()}**`);
      cmd.commands.forEach((subCmd: any) => buildLegacySidebar(subCmd, nameParts, sidebarLines));
   } else {
      sidebarLines.push(
         `\n${'  '.repeat(parentNames.length)}- [${nameParts.join(' ')}](${relDocPath})`
      );
   }
}

/** A fenced block whose body must not be interpreted as markdown (the option table cells). */
function escapePipes(value: string) {
   return value.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

function writeDocForCommand(cmd: any, docPath: string, nameParts: string[]) {
   const name = nameParts.join(' ');
   const description = cmd.description ? cmd.description() : '';
   const options = (cmd.options ?? []).filter((opt: any) => opt.flags !== '-h, --help');
   const subcommands = (cmd.commands ?? []).filter((sub: any) => !isDeprecated(sub));
   const hasSubcommands = subcommands.length > 0;

   const usage = hasSubcommands
      ? `$ caly-xano ${name} <command> [options]`
      : `$ caly-xano ${name} [options]`;

   const sections: string[] = [`# ${name}`];

   if (description) {
      sections.push(`{% alert type="note" title="Description" %}\n${description}\n{% /alert %}`);
   }

   // One terminal, showing the real shape of the command. `{% anim=true %}` types it out.
   sections.push(['## Usage', '', '```term {% anim=true %}', usage, '```'].join('\n'));

   if (options.length > 0) {
      const rows = options.map(
         (opt: any) => `| \`${escapePipes(opt.flags)}\` | ${escapePipes(opt.description || '')} |`
      );
      sections.push(
         [
            '## Options',
            '',
            '| Flag | Description |',
            '| --- | --- |',
            ...rows,
         ].join('\n')
      );
   }

   if (hasSubcommands) {
      const rows = subcommands.map(
         (sub: any) => `| \`${escapePipes(sub.name())}\` | ${escapePipes(sub.description() || '')} |`
      );
      sections.push(
         [
            '## Subcommands',
            '',
            '| Command | Description |',
            '| --- | --- |',
            ...rows,
         ].join('\n')
      );
   }

   mkdirSync(path.dirname(docPath), { recursive: true });
   writeFileSync(docPath, sections.join('\n\n') + '\n');
}

function collectDirectoryEntries(
   dir: string,
   section: string,
   source: DocSource,
   entries: ManifestEntry[],
   baseOrder: number
) {
   const abs = path.join(DOCS_DIR, dir);
   const files = readdirSync(abs)
      .filter((f) => f.endsWith('.md'))
      .sort();

   files.forEach((file, i) => {
      const rel = `${dir}/${file}`;
      const markdown = readFileSync(path.join(DOCS_DIR, rel), 'utf-8');
      const slug = file.replace(/\.md$/, '');
      entries.push({
         section,
         path: `${dir}/${slug}`,
         title: firstHeading(markdown, toTitleCase(file)),
         group: null,
         parent: null,
         order: baseOrder + i,
         source,
         segments: [slug],
         file: rel,
      });
   });
}

function buildManifest(entries: ManifestEntry[], links: ManifestLink[]): Manifest {
   return {
      version: 1,
      generatedAt: new Date().toISOString(),
      entries,
      links,
   };
}

function generateCliDocs() {
   try {
      console.log('Generating Caly-Xano CLI Docs \n');

      // 1. Clean docs directory
      rmSync(DOCS_DIR, { recursive: true, force: true });
      mkdirSync(DOCS_DIR, { recursive: true });

      // 1.1. Copy default template files:
      copyTemplateFiles(TEMPLATE_DIR, DOCS_DIR);
      console.log('Cleaned and recreated docs directory. \n');

      // 2. Generate the core-command overview: a short intro plus the grouped command list.
      const mainHelp = stripAnsi(program.helpInformation());
      const overview = [
         '# caly-xano — the core command',
         '',
         'Automate backups, docs, testing and version control for Xano. Every command is listed',
         'below; pick one from the sidebar, or run `caly-xano <command> --help` in your terminal.',
         '',
         '```term',
         `$ ${mainHelp.trim()}`,
         '```',
         '',
      ].join('\n');
      writeFileSync(path.join(DOCS_DIR, 'xano.md'), overview);
      console.log('Generated main help. \n');

      // 3. Recursively generate docs and collect the structured manifest
      const entries: ManifestEntry[] = [];
      const sidebarLines = ['- [caly-xano - the core command](xano.md)', '- **Commands**'];
      program.commands.forEach((cmd) => {
         walkCommand(cmd, [], entries);
         buildLegacySidebar(cmd, [], sidebarLines);
      });

      // Insert the core-command entry at the top of the manifest.
      entries.unshift({
         section: 'Commands',
         path: 'xano',
         title: 'caly-xano - the core command',
         group: null,
         parent: null,
         order: 0,
         source: 'generated',
         segments: ['xano'],
         file: 'xano.md',
      });
      // Re-number after the unshift so `order` reflects the final sequence.
      entries.forEach((entry, i) => (entry.order = i));

      const links: ManifestLink[] = [
         { section: 'External Resources', title: 'Calycode Extension', href: 'https://extension.calycode.com' },
         { section: 'External Resources', title: 'StateChange.ai', href: 'https://statechange.ai' },
         { section: 'External Resources', title: 'Axiom Logging', href: 'https://axiom.co' },
         { section: 'Changelog', title: 'CLI', href: 'https://github.com/calycode/xano-tools/blob/main/packages/cli/CHANGELOG.md' },
         { section: 'Changelog', title: 'CORE', href: 'https://github.com/calycode/xano-tools/blob/main/packages/core/CHANGELOG.md' },
         { section: 'Community', title: 'calycode on Discord', href: 'https://links.calycode.com/discord' },
      ];

      // Hand-written extra content, kept in the manifest too so it renders as static pages.
      // ADRs are deliberately excluded from the published docs — they are internal decision
      // records, not user-facing documentation, so they are not collected into the manifest.
      collectDirectoryEntries('guides', 'Guides', 'guide', entries, 90);

      // The docs home (README) is the first thing a reader should reach.
      entries.unshift({
         section: 'Overview',
         path: '',
         title: '@calycode/cli Docs',
         group: null,
         parent: null,
         order: -1,
         source: 'overview',
         segments: [],
         file: 'README.md',
      });
      entries.forEach((entry, i) => (entry.order = i));

      const manifest = buildManifest(entries, links);
      writeFileSync(path.join(DOCS_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
      console.log(`Generated manifest with ${entries.length} entries. \n`);

      // 4. Legacy docsify sidebar + guides/external links (unchanged deployment).
      const finalSidebar = [
         ...sidebarLines,
         `
- **Guides**

  - [Getting Started](guides/git-workflow.md)
  - [Registry Authoring](guides/registry-authoring.md)
  - [Scaffolding Components](guides/scaffolding.md)
  - [XanoScript](guides/xanoscript.md)
  - [Patterns & Best Practices](guides/patterns.md)
  - [API Testing](guides/testing.md)

- **External Resources**

  - [Calycode Extension](https://extension.calycode.com)
  - [StateChange.ai](https://statechange.ai)
  - [Axiom Logging](https://axiom.co)

-  Changelog

   -  [CLI](https://github.com/calycode/xano-tools/blob/main/packages/cli/CHANGELOG.md)
   -  [CORE](https://github.com/calycode/xano-tools/blob/main/packages/core/CHANGELOG.md)

-  Community

   -  [calycode on Discord](https://links.calycode.com/discord)

<small>For devs with 💖 by devs at [calycode](https://calycode.com).</small>

<small>Documentation powered by [Docsify.js](https://docsifyjs.org)</small>
      `,
      ];
      writeFileSync(path.join(DOCS_DIR, '_sidebar.md'), finalSidebar.join('\n'));

      // 5. Generate README as before
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
      writeFileSync(path.join(DOCS_DIR, 'README.md'), tocLines.join('\n'));
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
