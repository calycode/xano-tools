import { renderToHtml } from '../html.js';
import { toRenderable } from '../model.js';
import { RICH_STYLESHEET_HREF, createRichContext, registerAsset, } from './assets.js';
import { richHtmlComponents } from './components.js';
import { createRichConfig } from './config.js';
export function renderRichHtml(content, options = {}) {
    const ctx = createRichContext(options);
    registerAsset(ctx, {
        type: 'style',
        key: 'rich-css',
        href: options.stylesheetHref ?? RICH_STYLESHEET_HREF,
    });
    const tree = toRenderable(content, createRichConfig(ctx));
    const html = renderToHtml(tree, richHtmlComponents(ctx));
    return { html, assets: [...ctx.assets.values()] };
}
//# sourceMappingURL=render.js.map