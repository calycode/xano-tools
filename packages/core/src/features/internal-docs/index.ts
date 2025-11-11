const INTERNAL_DOCS_ASSETS = {
   html_template: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Internal Documentation</title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0" />
    <meta name="description" content="Internal documentation for your Xano workspace." />
    <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/docsify@^5.0.0-rc/dist/themes/core.min.css" />
    <!--
    <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/docsify@^5.0.0-rc/dist/themes/addons/core-dark.min.css" />
    -->
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap" rel="stylesheet" />
    <style>
      body {
         font-family: 'Noto Sans', ui-sans-serif, system-ui;
      }

      :root {
         --theme-color: #1b62f8;
         --content-max-width: 104ch;
         --content-margin-inline: 16px;
         --sidebar-toggle-alignment: start;
         /* start center end */
         --sidebar-toggle-bg: var(--color-mono-2);
         --sidebar-toggle-bg-hover: var(--button-bg);
         --sidebar-toggle-color: var(--color-mono-4);
         --sidebar-toggle-color-hover: var(--button-color);
         --sidebar-toggle-height: 42px;
         --sidebar-toggle-margin-block: 24px;
         --sidebar-toggle-width: 32px;

         /* termynal style variables */
         --termynal-bg: var(--code-bg);
         --termynal-color: var(--code-color);
         --termynal-color-subtle: var(--color-mono-5);
         --termynal-highlight-color: var(--theme-color);
         --termynal-cursor: #00ff00;
         --termynal-font: var(--font-family-mono);
         --termynal-font-size: var(--font-size-m);
         --termynal-border-radius: var(--border-radius);
      }

      /* Terminaly plugin styles customized to work with light and dark mode both */
      [data-termynal] {
         width: 100%;
         max-width: 100%;
         background: var(--termynal-bg);
         color: var(--termynal-color);
         font-size: var(--termynal-font-size);
         font-family: var(--termynal-font);
         border-radius: var(--termynal-border-radius);
         padding: 38px 15px 10px;
         position: relative;
         -webkit-box-sizing: border-box;
         box-sizing: border-box;
         z-index: 1;
      }

      /* termynal window-control-icons */
      [data-termynal]:before {
         content: '';
         position: absolute;
         top: 15px;
         left: 15px;
         display: inline-block;
         width: 15px;
         height: 15px;
         border-radius: 50%;
         /* A little hack to display the window buttons in one pseudo element. */
         background: #d9515d;
         -webkit-box-shadow: 25px 0 0 #f4c025, 50px 0 0 #3ec930;
         box-shadow: 25px 0 0 #f4c025, 50px 0 0 #3ec930;
      }

      /* termynal label */
      [data-termynal]:after {
         content: 'bash';
         position: absolute;
         color: var(--termynal-color-subtle);
         top: 5px;
         left: 0;
         width: 100%;
         text-align: center;
      }

      a[data-terminal-control] {
         color: var(--termynal-highlight-color);
         position: absolute;
         top: 5px;
         right: 15px;
         z-index: 2;
         text-decoration: none;
      }

      a[data-terminal-control]:hover {
         color: var(--termynal-highlight-color);
         font-weight: 700;
      }

      [data-ty] {
         display: block;
      }

      [data-ty]:before {
         /* Set up defaults and ensure empty lines are displayed. */
         content: '';
         display: inline-block;
         vertical-align: middle;
      }

      [data-ty='input']:before,
      [data-ty-prompt]:before {
         margin-right: 0.75em;
         color: var(--termynal-color);
      }

      [data-ty='input']:before {
         content: '$';
      }

      [data-ty][data-ty-prompt]:before {
         content: attr(data-ty-prompt);
      }

      [data-ty-cursor]:after {
         content: attr(data-ty-cursor);
         font-family: var(--termynal-font-family);
         margin-left: 0.5em;
         -webkit-animation: blink 1s infinite;
         animation: blink 1s infinite;
      }
    </style>

</head>
<body class="loading sidebar-chevron-left sidebar-group-box sidebar-toggle-chevron">
    <div id="app"></div>
    <script>
    window.$docsify = {
        el: '#app',
        name: 'Internal Documentation',
        loadSidebar: true,
        sidebarDisplayLevel: 1,
        subMaxLevel: 10,
        alias: {
            '/': '#/',
            '/.*/_sidebar.md': '/_sidebar.md',
        },
        nameLink: '#/',
        repo: '',
        autoHeader: true,
        notFoundPage: true,
        auto2top: true,
        search: 'auto',
        copyCode: { buttonText: 'copy' },
        pagination: { previousText: 'Previous', nextText: 'Next', crossChapter: true, crossChapterText: true },
        loadNavBar: false,
        pageActionItems: {
            button: {
               label: 'Copy page',
            },
         },
    };
    </script>

    <!-- Core Docsify and Plugins -->
    <script src="//cdn.jsdelivr.net/npm/docsify@^5.0.0-rc/dist/docsify.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/docsify@^5.0.0-rc/dist/plugins/search.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/docsify-copy-code/dist/docsify-copy-code.min.js"></script>
    <script src="//unpkg.com/docsify-pagination/dist/docsify-pagination.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/sxin0/docsify-termynal@main/dist/js/termynal.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/sxin0/docsify-termynal@main/dist/js/custom.js"></script>
    <script src="https://unpkg.com/docsify-plugin-flexible-alerts"></script>
    <!-- Page actions plugin -->
    <script src="//cdn.jsdelivr.net/npm/docsify-page-actions-menu@latest"></script>
    <script src="//cdn.jsdelivr.net/npm/docsify-sidebar-collapse/dist/docsify-sidebar-collapse.min.js"></script>
</body>
</html>
   `,
   welcome_readme: `
# Welcome to Internal Xano Workspace Documentation

This site contains auto-generated and curated documentation for your workspace.
Browse the sections below to explore APIs, automation functions, database tables, and more.

---

> [!INFO|label:Hint]
> Use the sidebar or search to quickly find any resource.

---

## 'Running in my head... All the things she said...'

_This is 'all the logic', so don't feel overwhelmed, just dive deeper through the sidebar. That'll help! You can also use full-text search in there._

{{ doc_items }}

___

<small>Documentation generated with 💖 for internal developer use via the [@calycode/cli](https://calycode.com/cli/docs) and is powered by [Docsify](https://docsifyjs.org).</small>
    `,
   sidebar: `

{{ doc_items }}

___
Docs powered by [Docsify](https:docsifyjs.org)
    `,
};

/**
 * Normalize a path by replacing an initial "./", "src/", or "/src/" segment with a single leading "/".
 *
 * @param url - The URL or filesystem path to normalize; may start with "./", "src/", or "/src/".
 * @returns The input path with a leading "./", "src/", or "/src/" replaced by "/" (otherwise returns the original string).
 */
function removeLeadingSrc(url: string): string {
   return url.replace(/^(\.\/)?(\/?src\/)/, '/');
}

/**
 * Capitalizes the first character of the given string.
 *
 * @param str - The input string; if empty, the empty string is returned.
 * @returns The input string with its first character converted to uppercase.
 */
function capitalize(str: string) {
   return str.charAt(0).toUpperCase() + str.slice(1);
}

type DocFile = { path: string; content: string };

/**
 * Generate README.md files for folders that do not already contain a README, based on the provided file paths.
 *
 * Each generated README lists the folder's direct children (subfolders or files) as a simple contents section.
 *
 * @param paths - Array of file paths used to infer folder structure
 * @returns An array of DocFile objects, each with `path` set to the new README path and `content` containing the generated Markdown for that folder
 */
function generateAllFolderReadmes(paths: string[]): DocFile[] {
   const fileSet = new Set(paths.map((p) => p.toLowerCase()));
   const folderSet = new Set<string>();
   paths.forEach((p) => {
      const parts = p.split('/');
      for (let i = 1; i < parts.length; ++i) {
         folderSet.add(parts.slice(0, i).join('/'));
      }
   });

   const allFolders = Array.from(folderSet);

   const results: DocFile[] = [];

   for (const folder of allFolders) {
      const readmePath = `${removeLeadingSrc(folder)}/README.md`;
      if (fileSet.has(readmePath.toLowerCase())) continue; // Already has a README

      // Find all direct children (folders or files, but not README.md itself)
      const children = Array.from(paths)
         .filter(
            (p) =>
               p.startsWith(folder + '/') &&
               p !== readmePath &&
               p.slice(folder.length + 1).indexOf('/') !== -1 // Only direct children
         )
         .map((p) => p.slice(folder.length + 1).split('/')[0])
         .filter((v, i, arr) => arr.indexOf(v) === i && v.toLowerCase() !== 'readme.md');

      if (children.length === 0) continue;

      let md = `# ${folder.split('/').pop()}\n\n`;
      md += `˙\n\n > [!INFO|label:Description]\n> This is just a brief table of contents. See what's inside below:`;
      md += `\n\n## Contents:\n\n`;
      for (const child of children.sort()) {
         md += `- [${child}](/${removeLeadingSrc(folder)}/${child}/)\n`;
      }
      results.push({ path: readmePath, content: md });
   }
   return results;
}

function generateFolderTree(paths: string[]): any {
   const tree: any = {};
   for (const path of paths) {
      const parts = path.replace(/\/README\.md$/, '').split('/');
      let node = tree;
      for (const part of parts) {
         if (!part) continue;
         node[part] = node[part] || {};
         node = node[part];
      }
   }
   return tree;
}

function renderSidebarTree(node: any, parentPath = '', level = 0): string {
   let out = '';
   const indent = '  '.repeat(level);
   const entries = Object.entries(node).sort(([a], [b]) => a.localeCompare(b));
   for (const [name, child] of entries) {
      const linkPath = `${parentPath}/${name}`.replace(/^\/+/, '');
      out += `${indent}- [${capitalize(name)}](/${linkPath}/)\n`;
      if (child && Object.keys(child).length > 0) {
         out += renderSidebarTree(child, linkPath, level + 1);
      }
   }
   return out;
}

function generateSidebar(paths: string[], sidebarTemplate: string): string {
   const tree = generateFolderTree(paths);
   const docItems = renderSidebarTree(tree);
   return sidebarTemplate.replace('{{ doc_items }}', docItems.trim());
}

function generateWelcomeReadme(paths: string[], welcomeReadmeTemplate: string): string {
   const tree = generateFolderTree(paths);
   const docItems = renderSidebarTree(tree);
   return welcomeReadmeTemplate.replace('{{ doc_items }}', docItems.trim());
}

export { INTERNAL_DOCS_ASSETS, generateAllFolderReadmes, generateSidebar, generateWelcomeReadme };