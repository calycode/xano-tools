# @calycode/xano-skills

Agent skills for Xano backend development. This collection provides procedural knowledge for AI coding agents to help with database optimization, security patterns, query performance, and best practices.

## Installation

### Via skills.sh CLI

```bash
npx skills add calycode/xano-tools
```

### Via CalyCode CLI

```bash
xano oc init  # Includes skills installation
# Or separately:
xano oc skills install
```

## Available Skills

| Skill                          | Description                                      | Priority |
| ------------------------------ | ------------------------------------------------ | -------- |
| `caly-xano-cli`                | CLI usage for xano commands                      | -        |
| `xano-database-best-practices` | Overview of PostgreSQL patterns for Xano         | HIGH     |
| `xano-query-performance`       | Query optimization, N+1 prevention, indexing     | CRITICAL |
| `xano-schema-design`           | Schema design, normalization, constraints        | HIGH     |
| `xano-security`                | RLS, SQL injection prevention, auth patterns     | CRITICAL |
| `xano-data-access`             | Addons, batch operations, caching                | MEDIUM   |
| `xano-monitoring`              | Query Analytics, debugging, performance tracking | MEDIUM   |

## When to Use These Skills

The AI agent will automatically reference these skills when:

- **CLI operations**: Running `xano` commands, generating specs, backups
- **Database design**: Creating tables, defining schemas, setting up indexes
- **API development**: Writing XanoScript, creating endpoints, handling auth
- **Performance issues**: Slow queries, N+1 patterns, missing indexes
- **Security reviews**: Input validation, RLS, preventing SQL injection

## Skill Structure

Each skill follows the [Agent Skills](https://agentskills.io/) format:

```
skills/
├── caly-xano-cli/
│   └── SKILL.md
├── xano-database-best-practices/
│   └── SKILL.md
├── xano-query-performance/
│   └── SKILL.md
├── xano-schema-design/
│   └── SKILL.md
├── xano-security/
│   └── SKILL.md
├── xano-data-access/
│   └── SKILL.md
└── xano-monitoring/
    └── SKILL.md
```

## Compatibility

These skills work with:

- [OpenCode](https://opencode.ai) - Open source AI coding agent
- [Claude Code](https://anthropic.com) - Anthropic's coding assistant
- [Cursor](https://cursor.sh) - AI-powered code editor
- [Windsurf](https://codeium.com/windsurf) - Codeium's AI IDE

## Related Packages

- `@calycode/cli` - CLI for Xano automation (backups, OpenAPI, codegen)
- `@calycode/opencode-templates` - OpenCode agents and commands for Xano

## License

MIT
