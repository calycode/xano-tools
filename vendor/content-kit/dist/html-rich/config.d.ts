import type { Config } from '@markdoc/markdoc';
import { type RichRenderContext } from './assets.js';
/**
 * The rich article schema: the shared document model with the few nodes whose *article* markup
 * differs.
 *
 * The difference is deliberate and small. A terminal fence (` ```term {% anim=true %} `) is a
 * product vocabulary the shared schema does not know, so it is added here and resolves to a
 * `Terminal` component the rich renderer draws. Headings drop the transcript sizing the shared
 * default carries, and links carry the `data-preview-link` hook the enhancer reads. Everything
 * else — diagrams, alerts, highlighted code, images — is the shared logic, untouched.
 */
export declare function createRichConfig(ctx: RichRenderContext): Config;
//# sourceMappingURL=config.d.ts.map