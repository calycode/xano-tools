---
name: xano-database-best-practices
description: Overview of PostgreSQL best practices adapted for Xano's architecture. Use as an entry point to understand Xano database optimization, then reference specialized skills for specific topics.
---

# Xano Database Best Practices

PostgreSQL best practices adapted for Xano's architecture, XanoScript, and abstraction layer.

## Quick Reference: Related Skills

| Topic | Skill | Priority |
|-------|-------|----------|
| Query optimization, N+1, indexing | `xano-query-performance` | CRITICAL |
| Schema design, normalization, constraints | `xano-schema-design` | HIGH |
| RLS, injection prevention, auth | `xano-security` | CRITICAL |
| Addons, batch operations, caching | `xano-data-access` | MEDIUM |
| Query Analytics, debugging | `xano-monitoring` | MEDIUM |

## Xano Architecture Overview

### Data Format Options

Xano supports two PostgreSQL data formats:

**Standard SQL Format (Default since late 2025):**
```sql
CREATE TABLE x_<workspaceID>_<tableID> (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP
);
```
- Full indexing support (B-tree, partial, composite)
- Native SQL query optimization
- Recommended for production applications

**JSONB Format (Legacy):**
```sql
CREATE TABLE mvpw_<workspaceID>_<tableID> (
  id SERIAL PRIMARY KEY,
  data JSONB
);
```
- Flexible schema changes
- Limited indexing (GIN indexes only)
- Better for prototyping or document-like data

### XanoScript Query Syntax

| Operation | PostgreSQL | XanoScript |
|-----------|------------|------------|
| Select all | `SELECT * FROM users` | `db.query user { return = {type: "list"} }` |
| Filter | `WHERE age > 25` | `db.query user { filter = "age > ?", 25 }` |
| Single record | `SELECT * FROM users WHERE id = 1 LIMIT 1` | `db.get user { field_name = "id", field_value = 1 }` |
| Insert | `INSERT INTO users (name) VALUES (?)` | `db.add user { name = "John" }` |
| Join | `LEFT JOIN posts ON...` | Use Addons pattern (see xano-data-access) |
| Raw SQL | Direct execution | `db.raw "SELECT * FROM users"` |

### Data Format Decision Tree

```
Does the optimization rely on field-level indexing?
├─ YES → Use Standard SQL format (B-tree indexes)
└─ NO → Does it involve complex queries (joins, CTEs)?
        ├─ YES → Use Standard SQL format
        └─ NO → Does schema change frequently?
                ├─ YES → JSONB format acceptable
                └─ NO → Use Standard SQL format (better performance)
```

## Key Best Practice Categories

### 1. Query Performance (CRITICAL)

See: `xano-query-performance` skill

**Critical patterns:**
- Use Addons instead of N+1 query loops
- Create indexes on frequently queried columns
- Always paginate large result sets
- Chain filters in single blocks

### 2. Schema Design (HIGH)

See: `xano-schema-design` skill

**Key principles:**
- Normalize data appropriately
- Choose correct data types
- Set up proper foreign keys and constraints
- Consider Standard SQL format for performance-critical tables

### 3. Security (CRITICAL)

See: `xano-security` skill

**Essential practices:**
- Enable Row Level Security (RLS) for sensitive data
- Use parameterized queries to prevent SQL injection
- Implement proper authentication flows
- Validate all user inputs

### 4. Data Access Patterns (MEDIUM)

See: `xano-data-access` skill

**Optimization techniques:**
- Use Addons for efficient joins
- Implement cursor-based pagination for large datasets
- Batch operations for bulk inserts/updates
- Leverage Xano's built-in caching

### 5. Monitoring & Diagnostics (MEDIUM)

See: `xano-monitoring` skill

**Monitoring approach:**
- Use Query Analytics dashboard
- Analyze slow queries via Direct Database Connector
- Set up performance baselines
- Track API response times

## JSONB vs Standard SQL Quick Reference

| Feature | JSONB Format | Standard SQL Format |
|---------|--------------|---------------------|
| B-tree indexes | No | Yes |
| Partial indexes | No | Yes |
| Composite indexes | Limited | Yes |
| Field-level SELECT | No (full record) | Yes |
| Schema flexibility | High | Low |
| Query optimization | Limited | Full PostgreSQL |
| Recommended for | Prototyping, documents | Production, complex queries |

## Performance Measurement

Use Xano Query Analytics (Dashboard → Analytics) to:
- Identify slow queries
- Track query frequency
- Monitor error rates
- Compare before/after optimizations

For advanced analysis with EXPLAIN:
- Use Direct Database Connector (Premium tier)
- Run `EXPLAIN ANALYZE` on problematic queries
- Check for sequential scans vs index scans

## Resources

- Xano Docs: https://docs.xano.com
- Database Performance: https://docs.xano.com/the-database/database-performance-and-maintenance
- XanoScript Reference: https://docs.xano.com/xanoscript
- Direct Database Query: https://docs.xano.com/the-function-stack/functions/database-requests/direct-database-query
