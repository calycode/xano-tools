/**
 * The single language vocabulary shared by every rendered surface.
 *
 * Four implementations used to answer "what language is this?" differently: the chat resolved
 * fence aliases and then guessed from the code, tool output guessed again on its own, and file
 * previews mapped extensions — each with its own idea of what "unknown" meant (`undefined` in
 * some, the string `'text'` in others). This module owns the one answer.
 *
 * It is deliberately grammar-free. Whether a language can actually be highlighted is Prism's
 * question, asked in ./prism — so inference stays pure, and testable without a highlighter.
 */
/** Fence labels people write, mapped to the id a grammar is registered under. */
const ALIASES = {
    js: 'javascript',
    node: 'javascript',
    ts: 'typescript',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    console: 'bash',
    yml: 'yaml',
    md: 'markdown',
    dockerfile: 'docker',
    'c++': 'cpp',
    'c#': 'csharp',
    cs: 'csharp',
    gql: 'graphql',
    html: 'markup',
    xml: 'markup',
    svg: 'markup',
};
/** File extensions, mapped to the same ids as the aliases. */
const EXTENSIONS = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    ps1: 'powershell',
    sql: 'sql',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'markup',
    html: 'markup',
    svg: 'markup',
    css: 'css',
    scss: 'scss',
    less: 'less',
    md: 'markdown',
    mdx: 'markdown',
    dockerfile: 'docker',
    toml: 'toml',
    diff: 'diff',
};
/** How a language is named in a code-block header. Keyed by the resolved id. */
const DISPLAY = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    bash: 'Bash',
    powershell: 'PowerShell',
    json: 'JSON',
    css: 'CSS',
    markup: 'HTML',
    markdown: 'Markdown',
    jsx: 'JSX',
    tsx: 'TSX',
    graphql: 'GraphQL',
    sql: 'SQL',
    yaml: 'YAML',
    docker: 'Dockerfile',
    c: 'C',
    cpp: 'C++',
    csharp: 'C#',
    java: 'Java',
    ruby: 'Ruby',
    go: 'Go',
    rust: 'Rust',
    php: 'PHP',
    swift: 'Swift',
    kotlin: 'Kotlin',
    toml: 'TOML',
    scss: 'SCSS',
    less: 'Less',
    diff: 'Diff',
    regex: 'Regex',
};
/** Commands that open a snippet, and so mean the snippet is a shell transcript. */
const SHELL_COMMANDS = new Set(['npm', 'pnpm', 'yarn', 'git', 'ls', 'cd', 'echo']);
/** Resolves a label to the id a grammar is registered under. Unknown labels pass through. */
export function resolveLanguageAlias(language) {
    if (!language)
        return undefined;
    const lower = language.toLowerCase().trim();
    if (!lower)
        return undefined;
    return ALIASES[lower] ?? lower;
}
/** Reads the language out of a file name, treating a bare `Dockerfile` as one. */
function fromFilename(filename) {
    const name = filename.split(/[\\/]/).pop() ?? filename;
    const dot = name.lastIndexOf('.');
    const extension = (dot > 0 ? name.slice(dot + 1) : name).toLowerCase();
    return EXTENSIONS[extension];
}
/** Guesses from the content itself, when the author labelled nothing. */
function fromCode(code) {
    const trimmed = code.trim();
    if (!trimmed)
        return undefined;
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        return 'json';
    }
    // Python is tested before JavaScript because both open with `import`, and `from x import y`
    // is the stronger tell — testing JavaScript first mislabels every Python import as JavaScript.
    if (/^\s*(def\s+\w+\s*\(|from\s+\S+\s+import\s)/m.test(trimmed))
        return 'python';
    if (/^\s*(interface\s+\w+|type\s+\w+\s*[={]|enum\s+\w+|implements\s+\w+)/m.test(trimmed)) {
        return 'typescript';
    }
    if (/^\s*(const|let|var|function|import|export|console\.)/m.test(trimmed))
        return 'javascript';
    if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/im.test(trimmed))
        return 'sql';
    if (trimmed.startsWith('<') && trimmed.includes('>'))
        return 'markup';
    if (trimmed.startsWith('#!/'))
        return 'bash';
    const first = trimmed.split(/\s+/)[0]?.toLowerCase() ?? '';
    if (SHELL_COMMANDS.has(first))
        return 'bash';
    return undefined;
}
/**
 * Infers the language of a piece of content, most trustworthy signal first: what the author
 * labelled it, then its file name, then the content itself. Returns `undefined` when nothing
 * says — an unknown language is a real answer, not the string `'text'`.
 */
export function inferLanguage(source) {
    const labelled = resolveLanguageAlias(source.language);
    if (labelled)
        return labelled;
    if (source.filename) {
        const named = fromFilename(source.filename);
        if (named)
            return named;
    }
    if (source.code !== undefined)
        return fromCode(source.code);
    return undefined;
}
/** How to name a language in a code-block header, e.g. `js` and `javascript` both give `JavaScript`. */
export function languageDisplayName(language, fallback = 'Code') {
    const resolved = resolveLanguageAlias(language);
    if (!resolved)
        return fallback;
    return DISPLAY[resolved] ?? resolved;
}
//# sourceMappingURL=language.js.map