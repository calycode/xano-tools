// Must come before Prism, which reads the flag it sets as it loads.
import './prism-worker-scope.js';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-regex';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-less';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import { resolveLanguageAlias } from './language.js';
/**
 * The one Prism setup, so the chat and the blog highlight the same code the same way.
 *
 * Two setups used to exist and disagreed: the chat's had no markup or CSS grammar, so `html`
 * fences fell back to unhighlighted text, while the blog's had both. The union is registered
 * here, and both surfaces now ask this module rather than reaching for `Prism.languages`.
 */
/**
 * The grammar for a language, or `undefined` when it cannot be highlighted — which is a normal
 * answer for prose labels like `text`, and for languages nobody registered.
 */
export function resolveGrammar(language) {
    const resolved = resolveLanguageAlias(language);
    if (!resolved)
        return undefined;
    return Prism.languages[resolved];
}
/**
 * Tokenizes code into Prism's tree, or `undefined` when the language cannot be highlighted.
 * Tokenizing rather than producing an HTML string is what lets both adapters render the same
 * result — the blog as Markdoc tags, the chat as Preact VNodes — without injecting HTML.
 */
export function tokenize(code, language) {
    const grammar = resolveGrammar(language);
    if (!grammar)
        return undefined;
    return Prism.tokenize(code, grammar);
}
//# sourceMappingURL=prism.js.map