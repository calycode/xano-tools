---
name: xano-schema-design
description: Schema design best practices for Xano - normalization, data types, foreign keys, constraints, and index design. Use when designing new tables or optimizing existing database structure.
---

# Xano Schema Design

PostgreSQL schema design best practices adapted for Xano's database layer.

## Data Format Selection

### Decision Criteria

| Criteria | Standard SQL | JSONB |
|----------|--------------|-------|
| Need B-tree indexes | Yes | No |
| Complex queries/joins | Yes | Limited |
| Schema changes frequently | Migration required | Flexible |
| Performance critical | Yes | Acceptable for small data |
| Document-like data | Possible | Natural fit |

**Default recommendation:** Standard SQL format for production applications.

## Normalization Principles

### When to Normalize

**Normalize when:**
- Data is repeated across records
- Updates would need to change multiple rows
- Referential integrity is important
- Relationships are clearly defined

**Denormalize when:**
- Read performance is critical
- Data rarely changes
- Avoiding joins is more important than data consistency

### Normalization Example

#### Before (Denormalized)

```
orders table:
| id | customer_name | customer_email | product_name | product_price |
```

**Problems:**
- Customer data duplicated per order
- Product data duplicated per order
- Updates require changing multiple rows

#### After (Normalized)

```
customers table:
| id | name | email |

products table:
| id | name | price |

orders table:
| id | customer_id | product_id | quantity | created_at |
```

**Benefits:**
- Single source of truth
- Updates affect one row
- Referential integrity via foreign keys

### Xano UI Steps (Create Foreign Key)

```
1. Database → orders table → Schema
2. Add field: customer_id (Integer)
3. Click the link icon next to the field
4. Select: Table Reference → customers → id
5. Save
```

---

## Data Type Selection

### Recommended Data Types

| Use Case | Xano Type | PostgreSQL Type | Notes |
|----------|-----------|-----------------|-------|
| IDs | Integer (auto) | SERIAL/BIGSERIAL | Primary keys |
| UUIDs | Text | UUID via Direct Query | Better for distributed systems |
| Short text | Text | VARCHAR | Names, titles |
| Long text | Textarea | TEXT | Descriptions, content |
| Email | Email | VARCHAR + constraint | Built-in validation |
| Boolean | Boolean | BOOLEAN | True/false flags |
| Integer | Integer | INTEGER | Counts, quantities |
| Decimal | Decimal | NUMERIC(p,s) | Money, precise values |
| Date only | Date | DATE | Birthdays, deadlines |
| Date + time | Timestamp | TIMESTAMPTZ | Events, created_at |
| JSON data | Object | JSONB | Flexible nested data |
| Array | Array | ARRAY/JSONB | Lists, tags |
| File | File | TEXT (URL) | Xano file storage |
| Image | Image | TEXT (URL) | Xano image storage |

### Data Type Anti-Patterns

```xanoscript
// Storing money as float - precision errors
price DECIMAL(10,2)  // Good
price FLOAT          // Bad - 0.1 + 0.2 = 0.30000000000000004

// Storing dates as strings
created_at TIMESTAMP  // Good - enables date functions
created_at TEXT       // Bad - no date operations

// Using text for booleans
is_active BOOLEAN     // Good
is_active TEXT        // Bad - "true", "True", "1", "yes"...
```

---

## Constraints

### NOT NULL Constraints

Apply NOT NULL to required fields:

```
Xano UI:
1. Database → [table] → Schema
2. Edit field
3. Enable "Required" toggle
4. Save
```

### Unique Constraints

For fields that must be unique (email, slug, etc.):

```
Xano UI:
1. Database → [table] → Indexes
2. Create Index
3. Select field (e.g., email)
4. Type: Unique
5. Save
```

### Check Constraints (Direct Query)

For custom validation rules:

```sql
-- Via Direct Database Query
ALTER TABLE products 
ADD CONSTRAINT positive_price CHECK (price > 0);

ALTER TABLE orders
ADD CONSTRAINT valid_quantity CHECK (quantity >= 1);
```

### Foreign Key Constraints

```
Xano UI:
1. Database → [table] → Schema
2. Click link icon on reference field
3. Select referenced table and field
4. Configure ON DELETE behavior:
   - CASCADE: Delete related records
   - SET NULL: Set reference to NULL
   - RESTRICT: Prevent deletion if referenced
5. Save
```

---

## Index Design

### Index Types in Xano

| Type | Use Case | Xano UI |
|------|----------|---------|
| Index | Standard queries | Yes |
| Unique | Enforce uniqueness | Yes |
| Spatial | Geographic data | Yes |
| Search | Full-text search | Yes |
| Partial | Conditional index | Direct Query only |
| Expression | Function-based | Direct Query only |

### Composite Index Guidelines

Order columns by:
1. Equality conditions first (`status = ?`)
2. Range conditions last (`created_at > ?`)
3. Most selective columns first

```
// Query pattern
WHERE user_id = ? AND status = ? AND created_at > ?

// Index order
(user_id, status, created_at)
```

### Partial Indexes (Direct Query)

Index only relevant rows:

```sql
-- Only index active users
CREATE INDEX idx_users_active_email 
ON users(email) 
WHERE status = 'active';

-- Only index pending orders
CREATE INDEX idx_orders_pending 
ON orders(created_at) 
WHERE status = 'pending';
```

**Benefit:** Smaller index, faster updates, faster queries on subset.

### Index Maintenance

Indexes need occasional maintenance:

```sql
-- Check index usage (Direct Query)
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Remove unused indexes (0 scans = unused)
DROP INDEX IF EXISTS unused_index_name;
```

---

## Table Design Patterns

### Timestamps Pattern

Always include audit timestamps:

```
Table schema:
| id | ... | created_at | updated_at |
```

Xano automatically manages `created_at`. For `updated_at`, use a trigger or set in API logic.

### Soft Delete Pattern

Instead of deleting records:

```
Table schema:
| id | ... | deleted_at | is_deleted |
```

```xanoscript
// Soft delete
db.raw "UPDATE users SET deleted_at = NOW(), is_deleted = true WHERE id = ?" as $result

// Query only active records
db.query user {
  filter = "is_deleted = ?", false
}
```

**Benefits:**
- Audit trail
- Easy restore
- Referential integrity preserved

### Status Enum Pattern

Use consistent status fields:

```
Recommended statuses for orders:
| pending | processing | completed | cancelled |

Table schema:
| id | ... | status |
```

Create index on status for filtering:

```
Indexes:
- status (Index type)
- (status, created_at) composite for sorted queries
```

### Multi-Tenant Pattern

For SaaS applications:

```
All tables include:
| id | tenant_id | ... |
```

```xanoscript
// Always filter by tenant
db.query order {
  filter = "tenant_id = ?", $auth.tenant_id
}
```

**Important:** Create composite indexes starting with `tenant_id`:

```
(tenant_id, status)
(tenant_id, created_at)
(tenant_id, user_id)
```

---

## JSONB Field Usage

### When to Use JSONB Fields

Even in Standard SQL format, JSONB fields are useful for:
- User preferences
- Metadata
- Flexible attributes
- API response caching

### JSONB Indexing

```sql
-- GIN index for containment queries
CREATE INDEX idx_users_preferences ON users USING GIN (preferences);

-- Supports: preferences @> '{"theme": "dark"}'
```

### JSONB Query Patterns

```xanoscript
// Filter by JSONB field (Direct Query)
db.raw "SELECT * FROM users WHERE preferences @> '{\"theme\": \"dark\"}'" as $dark_mode_users

// Extract JSONB value
db.raw "SELECT id, preferences->>'theme' as theme FROM users" as $themes
```

---

## Migration Patterns

### Adding Non-Null Column

```sql
-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN phone TEXT;

-- Step 2: Backfill data
UPDATE users SET phone = 'unknown' WHERE phone IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

### Renaming Column

```sql
ALTER TABLE users RENAME COLUMN fname TO first_name;
```

**Note:** Update all XanoScript and API references after rename.

### Changing Data Type

```sql
-- Safe type change (compatible types)
ALTER TABLE products ALTER COLUMN price TYPE NUMERIC(12,2);

-- Type change with cast
ALTER TABLE orders ALTER COLUMN quantity TYPE BIGINT USING quantity::BIGINT;
```

---

## Schema Review Checklist

Before deploying schema changes:

- [ ] All tables have appropriate primary keys
- [ ] Foreign keys defined for relationships
- [ ] Indexes on frequently filtered columns
- [ ] NOT NULL on required fields
- [ ] Unique constraints on unique fields (email, slug)
- [ ] Appropriate data types chosen
- [ ] Timestamps (created_at, updated_at) included
- [ ] Multi-tenant filter columns indexed

## Related Skills

- `xano-database-best-practices` - Format selection overview
- `xano-query-performance` - Index optimization
- `xano-security` - RLS and access control
- `xano-data-access` - Query patterns

## Resources

- Xano Database Docs: https://docs.xano.com/the-database/database-basics/using-the-xano-database
- Direct Database Query: https://docs.xano.com/the-function-stack/functions/database-requests/direct-database-query
- PostgreSQL Data Types: https://www.postgresql.org/docs/current/datatype.html
