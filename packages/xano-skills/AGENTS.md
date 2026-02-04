# Xano Development Skills

This package contains agent skills for Xano backend development. Each skill provides specialized knowledge for a specific domain.

## Skills Index

Use the appropriate skill based on your task:

### CLI & Tooling

- **caly-xano-cli** - CalyCode CLI commands for Xano automation

### Database (Start Here)

- **xano-database-best-practices** - Overview and entry point for database optimization

### Performance (CRITICAL)

- **xano-query-performance** - Query optimization, N+1 prevention, indexing strategies
- **xano-monitoring** - Query Analytics, debugging slow queries

### Design (HIGH)

- **xano-schema-design** - Schema normalization, data types, constraints, indexes
- **xano-data-access** - Addons, batch operations, caching patterns

### Security (CRITICAL)

- **xano-security** - Row Level Security, SQL injection prevention, authentication

## Skill Selection Guide

| Task                 | Primary Skill          | Supporting Skills            |
| -------------------- | ---------------------- | ---------------------------- |
| New table design     | xano-schema-design     | xano-database-best-practices |
| Slow API response    | xano-query-performance | xano-monitoring              |
| N+1 query issues     | xano-query-performance | xano-data-access             |
| Security audit       | xano-security          | xano-data-access             |
| CLI commands         | caly-xano-cli          | -                            |
| Production debugging | xano-monitoring        | xano-query-performance       |

## How to Use

Skills are loaded automatically when relevant tasks are detected. You can also explicitly reference a skill:

```
Use the xano-security skill to review this endpoint for vulnerabilities.
```

```
Apply xano-query-performance patterns to optimize this data fetching.
```
