# Keep `@calycode/core` platform-agnostic

The CLI's OpenCode subsystem depends on Node-heavy APIs — child processes, native messaging over stdin/stdout, OS-specific browser-manifest paths, and filesystem layout. `@calycode/core` is deliberately platform-agnostic and must remain usable outside Node, so OpenCode stays inside `@calycode/cli` even though `Caly` is the facade every other command routes through.

Rejected: folding OpenCode into core to give the subsystem one shared home. The platform coupling would leak into core and break its portability — a cost that outweighs the convenience of a single entrypoint.
