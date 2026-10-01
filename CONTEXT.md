# xano-tools

Tooling for Xano backend development: code generation, OpenAPI specs, documentation, automated tests, a component registry, and a local OpenCode runtime — all driven through a single CLI.

## Language

**OpenCode**:
The local AI coding runtime the CLI launches and manages against a Xano workspace.
_Avoid_: agent, assistant, assistant runtime

**OpenCode distribution**:
The concern of obtaining, versioning, installing, and launching OpenCode along with its templates and skills.
_Avoid_: installer, setup, updater

**Native host**:
The Chrome native-messaging process that bridges the browser extension to a local OpenCode server.
_Avoid_: bridge, daemon, extension host

**Artifact**:
An installable OpenCode payload — a template set or a skill set.
_Avoid_: resource, asset, bundle

**Registry**:
A shareable collection of standardized Xano components (functions, tables, queries, and tests).
_Avoid_: library, catalog, marketplace

**Context**:
The workspace / branch / API-group triple that a CLI command operates against.
_Avoid_: environment, target, instance

**Instance**:
A Xano deployment the tools connect to and mutate.
_Avoid_: tenant, server, project

**XanoScript**:
Xano's backend domain-specific language, which the tools read, generate, and validate.
_Avoid_: DSL, schema language

**Core** (`@calycode/core`):
The platform-agnostic business logic for Xano data, exposed through the `Caly` facade. Usable outside Node.
_Avoid_: backend, engine, service layer
