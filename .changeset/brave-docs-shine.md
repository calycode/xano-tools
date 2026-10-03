---
"@calycode/cli": minor
---

Add a static documentation site for the CLI.

`pnpm build:docs:static` pre-renders the docsify markdown into complete HTML pages with an in-page search index, a theme-aware shell, sidebar, and landing page, then deploys them to cli.calycode.com. The renderer converts legacy docsify `> [!NOTE]` callouts into `{% alert %}` blocks and restores `<details>` disclosures, and the sidebar rail, section headings, external links, and scrollbars all follow the theme. On localhost the pages additionally mount an Agentation toolbar for in-context UI feedback.
