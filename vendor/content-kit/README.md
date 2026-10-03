# @calycode/content-kit

One Markdoc document model, rendered two ways: to **HTML** for static pages, and to **Preact
VNodes** for live UI. The schema, the language inference, the Prism highlighting and the component
vocabulary are shared, so the same document looks the same wherever it is drawn.

It ships **batteries-included defaults** — code blocks, Mermaid blocks, images and alerts — so the
common case is a couple of lines. Every default can be overridden, and the renderers merge your map
over theirs rather than replacing it.

This package is **bound locally** (see below); it is `private` and not published to npm.

## Requirements

- Node with ESM (`"type": "module"` or a bundler that understands `exports`).
- `@markdoc/markdoc` and `prismjs` are installed with it as dependencies.
- For the Preact adapter, `preact` is an **optional** peer dependency.
- For `@calycode/content-kit/preact/rich`, `beautiful-mermaid` and `dompurify` are **optional**
  peer dependencies. A core-only install does not need them.

## Install (local bind)

From the consuming project, point pnpm at this directory:

```sh
pnpm add @calycode/content-kit@file:../aiaw-by-caly/packages/content-kit
# or, to keep a live symlink while you change the package:
pnpm add @calycode/content-kit@link:../aiaw-by-caly/packages/content-kit
```

The package builds itself on install through its `prepare` script. If your setup skips lifecycle
scripts, run `pnpm --filter @calycode/content-kit build` in the source repo first, so `dist/`
exists.

## HTML

```ts
import { toRenderable, renderToHtml } from '@calycode/content-kit';

const tree = toRenderable('# Hello\n\n```js\nconst x = 1;\n```\n');
const html = renderToHtml(tree);
```

`renderToHtml(tree, components?)`:

- With **no** second argument, it renders with the package defaults.
- With a map, it renders with **your components merged over the defaults** — pass only what you
  want to change.

```ts
import Markdoc from '@markdoc/markdoc';
import { toRenderable, renderToHtml } from '@calycode/content-kit';

const html = renderToHtml(toRenderable(source), {
   // Replaces only the code block; Alert, Mermaid and ImagePreview keep their defaults.
   CodeBlock: (attributes) =>
      new Markdoc.Tag('pre', {}, [String(attributes.code)]),
});
```

A component is `(attributes, children) => RenderableTreeNode`; see `HtmlComponent`.

### Rich article

The lean HTML defaults render a diagram as a source block and a code fence without a copy
button. For the article rendering the blog actually wants — an animated terminal, a drawn
Mermaid diagram, code copy and image zoom — opt into the rich HTML entry:

```ts
import { renderRichHtml } from '@calycode/content-kit/html/rich';

const { html, assets } = renderRichHtml(source);
// assets: the stylesheet, the client enhancer, and (only when a diagram is present) Mermaid.
```

It adds the ` ```term {% anim=true %} ` fence and `md-*` markup, and reports the assets the page
must load. Serve the packaged `assets/rich.css` and `assets/rich-enhance.js` at the paths the
renderer returns (defaults `/rich.css`, `/rich-enhance.js`), wrap the output in `.ck-article`,
and load the returned assets — styles first, scripts after the markup is in the DOM. The
enhancer renders Mermaid from the CDN `assets` entry and wires terminal replay, copy and zoom.

## Preact

```tsx
import { toRenderable } from '@calycode/content-kit';
import { renderToPreact } from '@calycode/content-kit/preact';

export function Markdown({ content }: { content: string }) {
   return <div>{renderToPreact(toRenderable(content))}</div>;
}
```

`renderToPreact(tree, components?)` follows the same merge rule as `renderToHtml`. The lean
defaults cover `CodeBlock`, `Mermaid`, `ImagePreview` and `Alert` without pulling in a diagram
library.

### Rich components

Opt in to a rendered, pan/zoomable Mermaid diagram and a copy button on code:

```tsx
import { renderToPreact } from '@calycode/content-kit/preact';
import { richPreactComponents } from '@calycode/content-kit/preact/rich';

renderToPreact(tree, richPreactComponents);
```

This entry pulls in `beautiful-mermaid` and `dompurify`; install both in the consuming project.

## Styling

The defaults are styled with Tailwind utility classes over a small set of design tokens. Import the
preset once, after Tailwind:

```css
@import "tailwindcss";
@import "@calycode/content-kit/tailwind.css";
```

The preset does two things:

1. Defines default values for `--color-background`, `--color-foreground`, `--color-muted`,
   `--color-muted-foreground`, `--color-border`, `--color-ring`, `--color-destructive` and
   `--color-primary`. Declare your own `@theme` block **after** the import to replace any of them.
2. Adds `@source "./dist"` so Tailwind scans the package for the classes its components use.
   Tailwind v4 does not scan `node_modules` on its own. If your bundler ignores `@source` inside an
   imported stylesheet, add this to your own CSS instead:

   ```css
   @source "../node_modules/@calycode/content-kit/dist";
   ```

Every component also carries stable `ck-*` hook classes (`ck-code`, `ck-alert`, `ck-mermaid`,
`ck-figure`), so you can restyle without depending on the utility classes.

## The schema

`createContentConfig(overrides?)` returns the shared Markdoc `Config`, extended by your overrides.

```ts
import { createContentConfig, toRenderable } from '@calycode/content-kit';

const config = createContentConfig(); // or pass { nodes: {...}, tags: {...} }
```

What the schema understands:

| Source | Produces | Default renderer |
| --- | --- | --- |
| ` ```js ` fence | `CodeBlock` | highlighted `<pre><code>` |
| ` ```mermaid ` fence | `Mermaid` | source block (rich: rendered diagram) |
| ` ```alert ` fence | `Alert` | tinted `<aside>` |
| `{% alert type="warning" %}` tag | `Alert` | tinted `<aside>` |
| `![alt](src)` | `ImagePreview` | `<figure>` + caption |
| `- [x] task` | `li` + checkbox | task list |
| bare URLs | `<a>` | linkified, `target="_blank"` |

Alert `type` is one of `note`, `tip`, `important`, `warning`, `caution`; anything else falls back to
`note`. Links and image URLs are scheme-checked before they reach an attribute.

## Exports

| Entry | Contents |
| --- | --- |
| `@calycode/content-kit` | model (`parse`, `toRenderable`), `createContentConfig`, `renderToHtml`, `defaultHtmlComponents`, `tokensToTags`, `tokenize`, `inferLanguage`, `sanitizeUrl`, `sanitizeImageUrl`, `ALERT_TYPES`, `FENCE_ATTRIBUTES`, `transformFence`, zoom/pan helpers |
| `@calycode/content-kit/html/rich` | `renderRichHtml`, `createRichConfig`, `richHtmlComponents`, `createRichContext`, asset helpers and the `term` fence |
| `@calycode/content-kit/html/rich.css` | the rich article stylesheet (wrap output in `.ck-article`) |
| `@calycode/content-kit/assets/rich-enhance.js` | the client enhancer (terminal, Mermaid, copy, zoom, link previews) |
| `@calycode/content-kit/preact` | `renderToPreact`, `defaultPreactComponents`, `HighlightedCode`, `ZoomPanViewer` |
| `@calycode/content-kit/preact/rich` | `richPreactComponents` |
| `@calycode/content-kit/tailwind.css` | the Tailwind v4 preset |

## License

MIT.
