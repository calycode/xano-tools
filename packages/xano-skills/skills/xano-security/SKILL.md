---
name: xano-security
description: Security best practices for Xano - Row Level Security (RLS), SQL injection prevention, authentication patterns, and input validation. Use when building secure APIs or auditing existing endpoints.
---

# Xano Security

Critical security practices for Xano applications, adapted from PostgreSQL security best practices.

## Priority: CRITICAL

Security vulnerabilities can expose sensitive data and compromise entire applications. Apply these patterns to every Xano project.

## Row Level Security (RLS)

### What is RLS?

Row Level Security restricts which rows users can access based on their identity. In Xano, this is implemented through:
- Filter conditions on every query
- Precondition checks in API endpoints
- Direct Database RLS policies (Premium)

### Basic RLS Pattern

Every query that returns user-specific data must filter by the authenticated user:

```xanoscript
// Get authenticated user from auth token
$auth.id as $current_user_id

// Filter all queries by user ownership
db.query order {
  filter = "user_id = ?", $current_user_id
} as $my_orders
```

### RLS via Preconditions

Use Xano's precondition blocks to enforce access:

```xanoscript
// Precondition block
precondition {
  condition = $auth.id != null
  error = "Authentication required"
  code = 401
}

// Another precondition for resource ownership
db.get order { field_name = "id", field_value = var.order_id } as $order

precondition {
  condition = $order.user_id == $auth.id
  error = "Access denied"
  code = 403
}
```

### Multi-Tenant RLS

For SaaS applications with multiple tenants:

```xanoscript
// Get tenant from auth context
$auth.tenant_id as $tenant_id

// EVERY query must include tenant filter
db.query customer {
  filter = "tenant_id = ?", $tenant_id
} as $customers

db.query order {
  filter = "tenant_id = ?", $tenant_id
} as $orders
```

**Critical:** Never trust client-provided tenant_id. Always derive from authentication.

### PostgreSQL RLS Policies (Direct Query)

For Premium tier with Direct Database Connector:

```sql
-- Enable RLS on table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy for users
CREATE POLICY user_orders ON orders
  FOR ALL
  TO authenticated_users
  USING (user_id = current_setting('app.current_user_id')::INTEGER);

-- Set user context before queries
SET app.current_user_id = '123';
```

**Note:** This requires careful session management in Xano.

---

## SQL Injection Prevention

### Understanding the Risk

SQL injection occurs when user input is directly concatenated into SQL queries:

```xanoscript
// VULNERABLE - NEVER DO THIS
db.raw "SELECT * FROM users WHERE email = '" + var.email + "'" as $user

// Attacker input: ' OR '1'='1
// Becomes: SELECT * FROM users WHERE email = '' OR '1'='1'
// Returns ALL users!
```

### Parameterized Queries (Safe)

Always use parameterized queries:

```xanoscript
// SAFE - Parameter binding
db.raw "SELECT * FROM users WHERE email = $1", var.email as $user

// SAFE - Xano's filter syntax
db.query user {
  filter = "email = ?", var.email
} as $user

// SAFE - Multiple parameters
db.raw "SELECT * FROM orders WHERE user_id = $1 AND status = $2", $auth.id, var.status as $orders
```

### XanoScript Filter Syntax

Xano's built-in filter syntax automatically parameterizes:

```xanoscript
// All parameters are safely bound
db.query product {
  filter = "category = ? AND price < ? AND name LIKE ?", 
    var.category, 
    var.max_price, 
    var.search + "%"
} as $products
```

### Dynamic Column/Table Names

If you must use dynamic identifiers (rare), validate against whitelist:

```xanoscript
// Define allowed columns
["name", "email", "created_at"] as $allowed_columns

// Validate user input
if ($allowed_columns | contains:var.sort_column) {
  db.raw "SELECT * FROM users ORDER BY " + var.sort_column as $users
} else {
  throw "Invalid sort column"
}
```

**Better approach:** Use fixed queries with conditional logic:

```xanoscript
if (var.sort_column == "name") {
  db.query user { sort = "name ASC" } as $users
} else if (var.sort_column == "created_at") {
  db.query user { sort = "created_at DESC" } as $users
} else {
  db.query user { sort = "id ASC" } as $users
}
```

---

## Input Validation

### Validate All Inputs

Never trust client data:

```xanoscript
// Validate email format
precondition {
  condition = var.email | is_email
  error = "Invalid email format"
  code = 400
}

// Validate required fields
precondition {
  condition = var.name != null && var.name | length > 0
  error = "Name is required"
  code = 400
}

// Validate numeric ranges
precondition {
  condition = var.quantity >= 1 && var.quantity <= 100
  error = "Quantity must be between 1 and 100"
  code = 400
}
```

### Type Coercion

Ensure inputs are correct types:

```xanoscript
// Convert to integer
var.user_id | to_int as $user_id

// Validate is actually a number
precondition {
  condition = $user_id | is_numeric
  error = "user_id must be a number"
  code = 400
}
```

### Length Limits

Prevent oversized inputs:

```xanoscript
precondition {
  condition = var.bio | length <= 500
  error = "Bio must be 500 characters or less"
  code = 400
}

precondition {
  condition = var.tags | count <= 10
  error = "Maximum 10 tags allowed"
  code = 400
}
```

### Sanitization

For HTML/script content:

```xanoscript
// Strip HTML tags
var.user_input | strip_tags as $safe_input

// Escape for HTML display
var.content | htmlspecialchars as $safe_html
```

---

## Authentication Best Practices

### Token Handling

```xanoscript
// Always check authentication
precondition {
  condition = $auth.id != null
  error = "Authentication required"
  code = 401
}

// Check specific roles
precondition {
  condition = $auth.role == "admin"
  error = "Admin access required"
  code = 403
}
```

### Password Security

Xano handles password hashing automatically with its Auth features, but if implementing custom auth:

```xanoscript
// NEVER store plain text passwords
// Use Xano's built-in password functions

// Hash password (when storing)
var.password | password_hash as $hashed

// Verify password (when authenticating)
var.input_password | password_verify:$stored_hash as $valid
```

### Session Management

```xanoscript
// Set reasonable token expiration
auth_token_expiry = 3600  // 1 hour

// For sensitive operations, require re-authentication
precondition {
  condition = $auth.issued_at > (now() - 300)  // Within 5 minutes
  error = "Please re-authenticate for this action"
  code = 401
}
```

### Rate Limiting

Implement in Xano's API settings:

```
API Settings:
1. Select API group
2. Set Rate Limiting:
   - Requests per minute: 60
   - Per: IP address or Auth token
3. Save
```

---

## Authorization Patterns

### Role-Based Access Control (RBAC)

```xanoscript
// Define role permissions
{
  "admin": ["read", "write", "delete", "manage_users"],
  "editor": ["read", "write"],
  "viewer": ["read"]
} as $role_permissions

// Check permission
$role_permissions[$auth.role] as $permissions

precondition {
  condition = $permissions | contains:"write"
  error = "Write permission required"
  code = 403
}
```

### Resource-Based Authorization

```xanoscript
// Fetch resource
db.get document { field_name = "id", field_value = var.doc_id } as $doc

// Check ownership OR admin
precondition {
  condition = $doc.owner_id == $auth.id || $auth.role == "admin"
  error = "Access denied"
  code = 403
}
```

### API Endpoint Security Matrix

| Endpoint | Auth Required | Roles | Owner Check |
|----------|--------------|-------|-------------|
| GET /users | Yes | admin | No |
| GET /users/:id | Yes | any | Self or admin |
| POST /orders | Yes | any | N/A (creates) |
| GET /orders/:id | Yes | any | Owner only |
| DELETE /orders/:id | Yes | admin | Or owner |

---

## Sensitive Data Handling

### Response Filtering

Never expose sensitive fields:

```xanoscript
// Fetch user
db.get user { field_name = "id", field_value = var.user_id } as $user

// Remove sensitive fields before returning
$user | remove:"password,password_reset_token,internal_notes" as $safe_user

return $safe_user
```

### Audit Logging

Log security-relevant actions:

```xanoscript
// Log sensitive operations
db.add audit_log {
  user_id = $auth.id,
  action = "password_change",
  ip_address = $request.ip,
  user_agent = $request.headers.user-agent,
  timestamp = now()
}
```

### Environment Secrets

Never hardcode secrets:

```xanoscript
// Access secrets from environment
env.API_SECRET as $secret
env.STRIPE_KEY as $stripe_key

// Never log secrets
// BAD: log($secret)
```

---

## Security Checklist

Before deploying any API:

### Authentication & Authorization
- [ ] All sensitive endpoints require authentication
- [ ] Role checks implemented where needed
- [ ] Resource ownership verified before access
- [ ] Token expiration configured appropriately

### Data Protection
- [ ] RLS filters applied to all queries returning user data
- [ ] Multi-tenant queries always filter by tenant_id
- [ ] Sensitive fields removed from API responses
- [ ] Passwords hashed, never stored in plain text

### Input Security
- [ ] All inputs validated before use
- [ ] Parameterized queries used (no string concatenation)
- [ ] Input length limits enforced
- [ ] Type coercion and validation applied

### Operational Security
- [ ] Rate limiting configured
- [ ] Audit logging for sensitive operations
- [ ] Environment secrets not hardcoded
- [ ] Error messages don't leak internal details

## Related Skills

- `xano-database-best-practices` - Overall architecture
- `xano-query-performance` - Safe query patterns
- `xano-data-access` - Secure data fetching
- `xano-monitoring` - Security monitoring

## Resources

- Xano Authentication: https://docs.xano.com/building-features/user-authentication-and-user-data
- Xano Security Best Practices: https://docs.xano.com
- OWASP SQL Injection Prevention: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
