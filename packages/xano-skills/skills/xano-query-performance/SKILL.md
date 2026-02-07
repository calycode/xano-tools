---
name: xano-query-performance
description: Critical query performance patterns for Xano - N+1 prevention with Addons, indexing via UI, pagination, and filter chaining. Use when optimizing slow Xano queries or building performant API endpoints.
---

# Xano Query Performance

Critical query optimization patterns adapted from PostgreSQL best practices for Xano's architecture.

## FIRST: Check Data Format

```
Standard SQL format → Full optimization available
JSONB format → Limited indexing (GIN only)
```

Most optimizations work best with Standard SQL format.

## Critical Patterns

### 1. N+1 Query Prevention (Use Addons)

**Priority: CRITICAL**

The most common performance issue in Xano applications.

#### Bad Pattern (N+1 Queries)

```xanoscript
// Executes 1 + N queries (N = number of users)
db.query user { return = {type: "list"} } as $users

foreach ($users) {
  each as $user {
    db.query post { filter = "user_id = ?", $user.id } as $posts
    // Process posts for each user
  }
}
```

**Why it's bad:**
- 100 users = 101 queries
- Linear performance degradation
- Database connection overhead per query

#### Good Pattern (Addons)

```xanoscript
// Executes 2 queries total (users + posts)
db.query user {
  return = {type: "list"}
  addon = {
    posts = { table: "post", filter: "user_id = user.id" }
  }
} as $users_with_posts
```

**Why it's better:**
- Always 2 queries regardless of user count
- Xano handles the join efficiently
- Results automatically nested

#### Multiple Addons Example

```xanoscript
db.query order {
  return = {type: "list"}
  filter = "status = ?", "pending"
  addon = {
    customer = { table: "user", filter = "id = order.user_id" },
    items = { table: "order_item", filter = "order_id = order.id" },
    shipping = { table: "shipping_address", filter = "id = order.shipping_id" }
  }
} as $enriched_orders
```

**Performance impact:** 50-100x faster for large datasets

---

### 2. Missing Indexes

**Priority: CRITICAL**

#### Identifying Missing Indexes

Columns that need indexes:
- Foreign keys (`user_id`, `order_id`, etc.)
- Frequently filtered columns (`status`, `email`, `created_at`)
- Columns used in ORDER BY
- Columns in JOIN conditions

#### Creating Indexes (Xano UI)

```
Steps:
1. Database → [table name] → Indexes tab
2. Click "Create Index"
3. Select field(s) to index
4. Choose index type:
   - Index: Standard B-tree (most common)
   - Unique: Enforces uniqueness (email, slug)
   - Spatial: Geographic queries
   - Search: Full-text search (GIN)
5. Save
```

#### Composite Index Example

For queries filtering on multiple columns:

```xanoscript
// Query pattern
db.query post {
  filter = "user_id = ? AND status = ?", $user_id, "published"
  sort = "created_at DESC"
}
```

Create composite index:
```
Index fields: user_id (ASC), status (ASC), created_at (DESC)
```

#### JSONB Format Limitations

```
Standard SQL: B-tree indexes on any column
JSONB: GIN index on entire 'data' column only

JSONB supports: data @> '{"status": "active"}'
JSONB does NOT support: Efficient range queries, partial indexes
```

**Recommendation:** Migrate to Standard SQL format for performance-critical tables.

---

### 3. Pagination (Always Use LIMIT/OFFSET)

**Priority: CRITICAL**

#### Bad Pattern (No Pagination)

```xanoscript
// Returns ALL records - dangerous for large tables
db.query user { return = {type: "list"} } as $users
```

**Problems:**
- Memory exhaustion on large tables
- Slow response times
- API timeouts

#### Good Pattern (Offset Pagination)

```xanoscript
// Page-based pagination
db.query user {
  return = {type: "list"}
  limit = 50
  offset = var.page * 50
} as $users
```

#### Better Pattern (Cursor Pagination)

For large datasets (10k+ records), use cursor-based pagination:

```xanoscript
// Cursor-based (more efficient for deep pagination)
db.query user {
  return = {type: "list"}
  filter = "id > ?", var.cursor
  sort = "id ASC"
  limit = 50
} as $users

// Return last ID as next cursor
$users | last | get:"id" as $next_cursor
```

**Why cursor is better:**
- Offset pagination slows down with depth (OFFSET 10000 scans 10000 rows)
- Cursor uses index efficiently at any depth

---

### 4. Filter Chaining (Single Block)

**Priority: HIGH**

#### Bad Pattern (Multiple Blocks)

```xanoscript
// Separate function blocks - slower
$data | filter1:arg1 as $step1

// Another block
$step1 | filter2:arg2 as $step2

// Another block  
$step2 | filter3:arg3 as $result
```

**Why it's bad:**
- Each block has overhead
- Variables copied between blocks
- Cannot be optimized by runtime

#### Good Pattern (Chained)

```xanoscript
// Single expression - 50% faster
$data | filter1:arg1 | filter2:arg2 | filter3:arg3 as $result
```

**Performance impact:** Up to 50% faster for complex filter chains

---

### 5. SELECT * Avoidance

**Priority: MEDIUM**

#### JSONB Format Consideration

In JSONB format, the entire record is stored in one column, so field selection happens at the application level, not database level.

```xanoscript
// JSONB: Full record is always fetched internally
db.query user { return = {type: "list"} } as $users

// Limit fields in API response
response = $users | map "id,name,email"
```

#### Standard SQL Format

Use Direct Query for selective field fetching:

```xanoscript
// Only fetches required columns from database
db.raw "SELECT id, name, email FROM users WHERE active = true" as $users
```

**Performance impact:** Reduces data transfer and memory usage, especially for wide tables.

---

### 6. Avoid Full Table Scans

**Priority: CRITICAL**

#### Signs of Full Table Scan

- Slow queries on large tables
- No index on filtered column
- Using LIKE with leading wildcard

#### Problematic Patterns

```xanoscript
// Leading wildcard - cannot use index
db.query user {
  filter = "email LIKE ?", "%@gmail.com"
}

// Function on indexed column - bypasses index
db.raw "SELECT * FROM users WHERE LOWER(email) = 'test@example.com'"
```

#### Solutions

```xanoscript
// Trailing wildcard - can use index
db.query user {
  filter = "email LIKE ?", "john%"
}

// For case-insensitive search, use expression index (Direct Query)
db.raw "CREATE INDEX idx_users_email_lower ON users(LOWER(email))"
```

---

## Quick Checklist

Before deploying any Xano API:

- [ ] No N+1 queries - using Addons for related data
- [ ] Indexes on all frequently filtered columns
- [ ] Pagination implemented for list endpoints
- [ ] Filters chained in single blocks where possible
- [ ] No leading wildcards in LIKE queries
- [ ] Large tables using Standard SQL format

## Performance Testing

### Using Query Analytics

```
Dashboard → Analytics → Query Performance
```

Track:
- Average response time
- Query frequency
- Error rate
- Slow query patterns

### Using Direct Database Connector (Premium)

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

Look for:
- `Seq Scan` = Full table scan (bad)
- `Index Scan` = Using index (good)
- `Rows` vs `Actual Rows` = Estimate accuracy

## Related Skills

- `xano-database-best-practices` - Overview and format decision
- `xano-data-access` - Addons patterns in depth
- `xano-schema-design` - Index design principles
- `xano-monitoring` - Query Analytics usage

## Resources

- Xano Indexing Guide: https://docs.xano.com/the-database/database-performance-and-maintenance/indexing
- Database Performance: https://docs.xano.com/the-database/database-performance-and-maintenance
- Query Optimization Tutorial: https://www.xano.com/learn/database-index-basics-speed-up-queries/
