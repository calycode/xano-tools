---
name: xano-monitoring
description: Monitoring and diagnostics for Xano - Query Analytics, debugging slow queries, performance tracking, and error logging. Use when troubleshooting performance issues or setting up monitoring.
---

# Xano Monitoring & Diagnostics

Performance monitoring, query analysis, and debugging patterns for Xano applications.

## Query Analytics Dashboard

### Accessing Query Analytics

```
Dashboard → Analytics → Query Performance
```

### Key Metrics to Monitor

| Metric | Description | Target |
|--------|-------------|--------|
| Response Time | Average API response time | < 200ms |
| Query Count | Queries per request | < 10 |
| Error Rate | Failed requests percentage | < 1% |
| Slow Queries | Queries > 1 second | 0 |
| Throughput | Requests per minute | Depends on tier |

### Identifying Problem Areas

```
Sort by:
- Slowest queries (high response time)
- Most frequent queries (optimization impact)
- Highest error rate (reliability issues)
```

---

## Slow Query Analysis

### Common Causes

1. **Missing indexes** - Full table scans
2. **N+1 queries** - Loop-based data fetching
3. **Unbounded queries** - No LIMIT clause
4. **Complex joins** - Multiple table traversal
5. **Large payloads** - Fetching unnecessary data

### Diagnosing with EXPLAIN (Direct Query)

```sql
-- Analyze query plan
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;
```

**Reading EXPLAIN output:**

```
Seq Scan on orders  (cost=0.00..1000.00 rows=100 width=200)
  Filter: (user_id = 123)
  Rows Removed by Filter: 9900
```

**Problems to look for:**
- `Seq Scan` - Full table scan (add index)
- `Rows Removed by Filter` - High number (index would help)
- `Sort` - Consider index with matching order
- `Nested Loop` - Check for N+1 pattern

### Index Scan (Good)

```
Index Scan using idx_orders_user_id on orders  (cost=0.00..10.00 rows=100 width=200)
  Index Cond: (user_id = 123)
```

---

## Performance Benchmarking

### Establishing Baselines

Create a performance log table:

```sql
CREATE TABLE performance_log (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  response_time_ms INTEGER,
  query_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Logging in XanoScript

```xanoscript
// At start of endpoint
now() as $start_time

// ... endpoint logic ...

// At end of endpoint
now() - $start_time as $duration_ms

db.add performance_log {
  endpoint = $request.path,
  method = $request.method,
  response_time_ms = $duration_ms,
  query_count = $query_count
}
```

### Analyzing Performance Trends

```sql
-- Average response time by endpoint
SELECT 
  endpoint,
  AVG(response_time_ms) as avg_time,
  MAX(response_time_ms) as max_time,
  COUNT(*) as request_count
FROM performance_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY endpoint
ORDER BY avg_time DESC;

-- Hourly performance trends
SELECT 
  date_trunc('hour', created_at) as hour,
  AVG(response_time_ms) as avg_time,
  COUNT(*) as requests
FROM performance_log
GROUP BY hour
ORDER BY hour DESC;
```

---

## Error Logging

### Structured Error Logging

```xanoscript
// Error log table
// id, level, message, context, stack_trace, user_id, created_at

try {
  // Risky operation
  db.query some_table { filter = "id = ?", var.id } as $result
} catch ($error) {
  db.add error_log {
    level = "error",
    message = $error.message,
    context = {
      endpoint: $request.path,
      input: var,
      user_id: $auth.id
    } | json_encode,
    stack_trace = $error.stack,
    user_id = $auth.id
  }
  
  throw $error  // Re-throw after logging
}
```

### Error Log Analysis

```sql
-- Error frequency by type
SELECT 
  message,
  COUNT(*) as occurrences,
  MAX(created_at) as last_seen
FROM error_log
WHERE level = 'error'
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY message
ORDER BY occurrences DESC;

-- Errors by user
SELECT 
  user_id,
  COUNT(*) as error_count
FROM error_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
HAVING COUNT(*) > 5
ORDER BY error_count DESC;
```

### Log Levels

| Level | Use Case | Action |
|-------|----------|--------|
| DEBUG | Development info | Not in production |
| INFO | Normal operations | Log selectively |
| WARN | Potential issues | Monitor |
| ERROR | Failures | Alert + investigate |
| CRITICAL | System failures | Immediate action |

---

## Database Statistics

### Table Size Analysis

```sql
-- Table sizes
SELECT 
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_size_pretty(pg_relation_size(relid)) as table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### Index Usage Statistics

```sql
-- Index usage (find unused indexes)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  idx_tup_read as rows_read
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Indexes never used (candidates for removal)
SELECT indexname, tablename
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

### Row Counts

```sql
-- Approximate row counts (fast)
SELECT 
  relname as table_name,
  reltuples::BIGINT as row_count
FROM pg_class
WHERE relkind = 'r'
ORDER BY reltuples DESC;
```

---

## Real-Time Monitoring

### Active Connections

```sql
-- Current database connections
SELECT 
  state,
  COUNT(*) as connection_count
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- Long-running queries
SELECT 
  pid,
  now() - pg_stat_activity.query_start as duration,
  query,
  state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds'
AND state != 'idle';
```

### Lock Monitoring

```sql
-- Check for blocking locks
SELECT 
  blocked.pid as blocked_pid,
  blocked.query as blocked_query,
  blocking.pid as blocking_pid,
  blocking.query as blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE blocked.pid != blocking.pid;
```

---

## Alerting Patterns

### Threshold-Based Alerts

```xanoscript
// Check metrics and alert if thresholds exceeded
db.raw "SELECT AVG(response_time_ms) as avg_time FROM performance_log WHERE created_at > NOW() - INTERVAL '5 minutes'" as $recent_perf

if ($recent_perf[0].avg_time > 500) {
  // Send alert (webhook, email, etc.)
  http.post "https://hooks.slack.com/your-webhook" {
    body = {
      text: "Performance Alert: Average response time " + $recent_perf[0].avg_time + "ms (threshold: 500ms)"
    }
  }
}
```

### Error Rate Alerts

```xanoscript
db.raw "
  SELECT 
    COUNT(*) FILTER (WHERE status >= 500) as errors,
    COUNT(*) as total
  FROM request_log
  WHERE created_at > NOW() - INTERVAL '5 minutes'
" as $error_stats

$error_stats[0].errors / $error_stats[0].total as $error_rate

if ($error_rate > 0.05) {  // 5% error rate
  // Send critical alert
}
```

---

## Debugging Workflow

### Step 1: Identify the Problem

```
1. Check Query Analytics for slow endpoints
2. Look at error logs for failures
3. Review recent changes/deployments
```

### Step 2: Reproduce

```
1. Get specific request parameters
2. Test in Xano debugger
3. Observe query execution
```

### Step 3: Analyze

```xanoscript
// Enable debug logging
debug = true

// Log intermediate values
log("User ID: " + $user_id)
log("Query result count: " + ($result | count))
```

### Step 4: Fix and Verify

```
1. Apply fix (index, code change, etc.)
2. Test specific case
3. Monitor metrics for improvement
4. Document the fix
```

---

## Performance Optimization Checklist

### Before Deployment

- [ ] All list endpoints have pagination
- [ ] Indexes on frequently queried columns
- [ ] No N+1 query patterns
- [ ] Response payload size appropriate
- [ ] Error handling with logging

### Weekly Review

- [ ] Check slow query log
- [ ] Review error frequency
- [ ] Analyze table sizes and growth
- [ ] Verify index usage
- [ ] Check connection pool usage

### Monthly Review

- [ ] Remove unused indexes
- [ ] Archive old log data
- [ ] Review performance trends
- [ ] Update baselines if needed

---

## Xano-Specific Monitoring Tools

### Built-in Features

| Feature | Location | Use Case |
|---------|----------|----------|
| Query Analytics | Dashboard → Analytics | Performance overview |
| API Logs | Dashboard → Logs | Request debugging |
| Function Debugger | Function Stack → Debug | Step-through execution |
| Real-time Metrics | Dashboard | Live traffic |

### External Integrations

```
Webhook → External monitoring:
- Datadog
- New Relic
- Custom solutions

Export logs to:
- Cloud logging services
- Data warehouses
- Alerting platforms
```

---

## Quick Diagnosis Guide

| Symptom | Likely Cause | Investigation |
|---------|--------------|---------------|
| Slow response | Missing index | EXPLAIN query |
| Increasing latency | Growing data | Check table sizes |
| Timeout errors | Long query | Active query list |
| Memory issues | Large result sets | Check pagination |
| Connection errors | Pool exhausted | Connection stats |

## Related Skills

- `xano-query-performance` - Query optimization
- `xano-data-access` - Efficient data fetching
- `xano-schema-design` - Index planning

## Resources

- Xano Dashboard: https://docs.xano.com/xano-features/the-dashboard
- Database Performance: https://docs.xano.com/the-database/database-performance-and-maintenance
- PostgreSQL Monitoring: https://www.postgresql.org/docs/current/monitoring.html
