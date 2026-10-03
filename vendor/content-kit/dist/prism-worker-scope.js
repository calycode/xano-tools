/**
 * Stops Prism installing a `message` listener of its own when it loads inside a worker.
 *
 * Prism detects a worker scope and, unless told otherwise, listens for its own worker protocol: a
 * JSON string of `{ language, code }`. Our workers speak worker-kit's protocol and post structured
 * objects, so that listener ran `JSON.parse` on an object, threw `"[object Object]" is not valid
 * JSON` on every message, and the pool's error handling rejected the pending render. The chat then
 * fell back to showing raw Markdown, and said nothing about why.
 *
 * Prism reads this flag off its scope as it loads, so it has to be set first. Module evaluation
 * follows import order, which is why this is a module of its own: being imported above `prismjs`
 * is the entire job.
 */
const scope = globalThis;
scope.Prism = { ...(scope.Prism ?? {}), disableWorkerMessageHandler: true };
export {};
//# sourceMappingURL=prism-worker-scope.js.map