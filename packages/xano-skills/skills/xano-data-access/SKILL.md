---
name: xano-data-access
description: Data access patterns for Xano - Addons for joins, batch operations, cursor pagination, caching, and eager loading. Use when optimizing data fetching or handling large datasets.
---

# Xano Data Access Patterns

Efficient data access patterns for Xano, focusing on Addons, batch operations, and caching.

## Addons (Xano's Join Mechanism)

### What Are Addons?

Addons are Xano's efficient way to fetch related data without N+1 queries. They replace SQL JOINs with a more structured approach.

### Basic Addon Pattern

```xanoscript
// Fetch users with their related posts
db.query user {
  return = {type: "list"}
  addon = {
    posts = { table: "post", filter = "user_id = user.id" }
  }
} as $users_with_posts
```

**Result structure:**
```json
[
  {
    "id": 1,
    "name": "John",
    "posts": [
      { "id": 101, "title": "First Post" },
      { "id": 102, "title": "Second Post" }
    ]
  }
]
```

### Multiple Addons

```xanoscript
db.query order {
  return = {type: "list"}
  filter = "status = ?", "pending"
  addon = {
    customer = { 
      table: "user", 
      filter = "id = order.user_id",
      type: "single"  // One-to-one relationship
    },
    items = { 
      table: "order_item", 
      filter = "order_id = order.id",
      type: "list"  // One-to-many relationship
    },
    shipping_address = { 
      table: "address", 
      filter = "id = order.shipping_address_id",
      type: "single"
    }
  }
} as $enriched_orders
```

### Nested Addons

```xanoscript
db.query category {
  return = {type: "list"}
  addon = {
    products = { 
      table: "product", 
      filter = "category_id = category.id",
      addon = {
        reviews = { 
          table: "review", 
          filter = "product_id = product.id" 
        }
      }
    }
  }
} as $categories_with_products_and_reviews
```

### Addon with Sorting and Limiting

```xanoscript
db.query user {
  return = {type: "list"}
  addon = {
    recent_posts = { 
      table: "post", 
      filter = "user_id = user.id",
      sort = "created_at DESC",
      limit = 5  // Only latest 5 posts
    }
  }
} as $users_with_recent_posts
```

### Addon Performance

| Approach | Queries | Performance |
|----------|---------|-------------|
| N+1 Loop | 1 + N | Slow, scales poorly |
| Addon | 2 | Fast, constant regardless of N |
| Direct JOIN | 1 | Fastest (requires Direct Query) |

---

## Batch Operations

### Bulk Insert

```xanoscript
// Prepare array of records
[
  { name: "Product A", price: 100 },
  { name: "Product B", price: 200 },
  { name: "Product C", price: 300 }
] as $products_to_insert

// Batch insert
foreach ($products_to_insert) {
  each as $product {
    db.add product {
      name = $product.name,
      price = $product.price
    }
  }
}

// For larger batches, use Direct Query
db.raw "INSERT INTO products (name, price) VALUES 
  ('Product A', 100),
  ('Product B', 200),
  ('Product C', 300)"
```

### Bulk Update

```xanoscript
// Update via Direct Query for efficiency
db.raw "UPDATE products SET price = price * 1.1 WHERE category_id = $1", var.category_id

// Or update specific records
db.raw "UPDATE products SET status = 'archived' WHERE created_at < $1", var.cutoff_date
```

### Bulk Delete

```xanoscript
// Soft delete pattern (preferred)
db.raw "UPDATE orders SET deleted_at = NOW() WHERE status = 'cancelled' AND created_at < $1", var.cutoff_date

// Hard delete (use cautiously)
db.raw "DELETE FROM temp_data WHERE expires_at < NOW()"
```

### Transaction Pattern

For operations that must succeed together:

```xanoscript
// Via Direct Query with transaction
db.raw "BEGIN"

db.raw "UPDATE accounts SET balance = balance - $1 WHERE id = $2", var.amount, var.from_account
db.raw "UPDATE accounts SET balance = balance + $1 WHERE id = $2", var.amount, var.to_account
db.raw "INSERT INTO transfers (from_id, to_id, amount) VALUES ($1, $2, $3)", var.from_account, var.to_account, var.amount

db.raw "COMMIT"
```

**Note:** If any query fails, you should ROLLBACK. Consider using Xano's built-in transaction support when available.

---

## Pagination Patterns

### Offset Pagination

Simple but less efficient for deep pages:

```xanoscript
// Calculate offset
var.page | to_int as $page
50 as $per_page
($page - 1) * $per_page as $offset

db.query product {
  return = {type: "list"}
  limit = $per_page
  offset = $offset
  sort = "created_at DESC"
} as $products

// Get total count for pagination UI
db.raw "SELECT COUNT(*) as total FROM products" as $count_result
$count_result[0].total as $total

// Return with pagination meta
{
  data: $products,
  pagination: {
    page: $page,
    per_page: $per_page,
    total: $total,
    total_pages: ceil($total / $per_page)
  }
}
```

### Cursor Pagination

More efficient for large datasets:

```xanoscript
// Use last record's ID as cursor
var.cursor | to_int | default:0 as $cursor
50 as $per_page

db.query product {
  return = {type: "list"}
  filter = "id > ?", $cursor
  sort = "id ASC"
  limit = $per_page + 1  // Fetch one extra to check if more exist
} as $products

// Check if there are more
$products | count > $per_page as $has_more

// Remove extra record if present
if ($has_more) {
  $products | slice:0:$per_page as $products
}

// Get next cursor
$products | last | get:"id" as $next_cursor

// Return with cursor meta
{
  data: $products,
  pagination: {
    next_cursor: $has_more ? $next_cursor : null,
    has_more: $has_more
  }
}
```

### Keyset Pagination (Multiple Sort Columns)

For complex sorting:

```xanoscript
// Cursor includes both values
var.cursor_created_at as $cursor_created
var.cursor_id as $cursor_id

db.query post {
  return = {type: "list"}
  filter = "(created_at, id) < (?, ?)", $cursor_created, $cursor_id
  sort = "created_at DESC, id DESC"
  limit = 20
} as $posts
```

---

## Caching Patterns

### Xano Built-in Caching

Configure in API settings:

```
API Settings → Caching:
- Cache Duration: 60 seconds
- Cache Key: Based on inputs
- Invalidation: Manual or time-based
```

### Computed Cache Pattern

For expensive calculations:

```xanoscript
// Check cache first
db.get cache { 
  field_name = "key", 
  field_value = "stats_" + var.user_id 
} as $cached

if ($cached != null && $cached.expires_at > now()) {
  return $cached.value
}

// Expensive calculation
db.raw "SELECT COUNT(*) as orders, SUM(total) as revenue FROM orders WHERE user_id = $1", var.user_id as $stats

// Cache result
db.add cache {
  key = "stats_" + var.user_id,
  value = $stats[0],
  expires_at = now() + 3600  // 1 hour
}

return $stats[0]
```

### Cache Invalidation

```xanoscript
// After data changes, invalidate cache
db.raw "DELETE FROM cache WHERE key LIKE 'stats_%'"

// Or invalidate specific entry
db.raw "DELETE FROM cache WHERE key = $1", "stats_" + var.user_id
```

---

## Eager Loading vs Lazy Loading

### Eager Loading (Addons)

Fetch everything upfront:

```xanoscript
// Single request, all data loaded
db.query order {
  return = {type: "list"}
  addon = {
    items = { table: "order_item", filter = "order_id = order.id" },
    customer = { table: "user", filter = "id = order.user_id" }
  }
} as $orders
```

**When to use:**
- You know you'll need the related data
- Displaying lists with related information
- Reports and dashboards

### Lazy Loading (Separate Endpoints)

Fetch on demand:

```xanoscript
// Endpoint 1: GET /orders
db.query order { return = {type: "list"} } as $orders

// Endpoint 2: GET /orders/:id/items (called when needed)
db.query order_item {
  filter = "order_id = ?", var.order_id
} as $items
```

**When to use:**
- Related data not always needed
- Mobile apps with limited bandwidth
- Progressive disclosure UI patterns

---

## Filtering Patterns

### Dynamic Filtering

```xanoscript
// Build filter conditions dynamically
"1=1" as $filter  // Always true base
[] as $params

if (var.status != null) {
  $filter + " AND status = ?" as $filter
  $params | push:var.status as $params
}

if (var.min_price != null) {
  $filter + " AND price >= ?" as $filter
  $params | push:var.min_price as $params
}

if (var.category != null) {
  $filter + " AND category_id = ?" as $filter
  $params | push:var.category as $params
}

// Execute with dynamic filter
db.query product {
  filter = $filter, ...$params
} as $products
```

### Search Pattern

```xanoscript
// Full-text search (requires Search index)
db.query product {
  filter = "search_vector @@ to_tsquery(?)", var.search_query
} as $results

// Simple LIKE search
db.query product {
  filter = "name ILIKE ?", "%" + var.search + "%"
} as $results
```

### Date Range Filtering

```xanoscript
db.query order {
  filter = "created_at >= ? AND created_at < ?", 
    var.start_date, 
    var.end_date
  sort = "created_at DESC"
} as $orders
```

---

## Aggregation Patterns

### Basic Aggregates

```xanoscript
// Via Direct Query
db.raw "SELECT 
  COUNT(*) as total_orders,
  SUM(total) as revenue,
  AVG(total) as avg_order_value
FROM orders 
WHERE created_at >= $1", var.start_date as $stats
```

### Group By

```xanoscript
db.raw "SELECT 
  status,
  COUNT(*) as count,
  SUM(total) as revenue
FROM orders
GROUP BY status" as $by_status
```

### Window Functions

```xanoscript
db.raw "SELECT 
  id,
  user_id,
  total,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as order_number
FROM orders" as $orders_with_sequence
```

---

## Quick Reference

| Pattern | Use Case | Queries |
|---------|----------|---------|
| Addon | Related data | 2 |
| N+1 Loop | Never | 1+N |
| Direct JOIN | Complex joins | 1 |
| Batch Insert | Bulk data | 1 per batch |
| Offset Pagination | Simple lists | 1-2 |
| Cursor Pagination | Large datasets | 1-2 |
| Cached Query | Repeated expensive ops | 1 or 0 |

## Checklist

- [ ] Using Addons instead of loops for related data
- [ ] Pagination on all list endpoints
- [ ] Batch operations for bulk data
- [ ] Appropriate caching for expensive queries
- [ ] Indexes on filter and sort columns

## Related Skills

- `xano-query-performance` - Query optimization
- `xano-schema-design` - Relationship design
- `xano-monitoring` - Performance tracking

## Resources

- Xano Database Queries: https://docs.xano.com/the-function-stack/functions/database-requests
- Direct Database Query: https://docs.xano.com/the-function-stack/functions/database-requests/direct-database-query
- XanoScript Reference: https://docs.xano.com/xanoscript
