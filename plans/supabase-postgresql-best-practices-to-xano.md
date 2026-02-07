# Xano Agent Skills Implementation Plan

**Adapting Supabase PostgreSQL Best Practices for Xano Infrastructure**

**Project Goal**: Create a comprehensive set of AI agent skills for Xano that teaches agents (Claude, Cursor, etc.) PostgreSQL best practices adapted to Xano's architecture, query language, and abstraction layer.

**Created**: February 3, 2026
**Status**: Planning Phase
**Estimated Duration**: 12 weeks

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Background & Context](#background--context)
3. [Key Resources & Links](#key-resources--links)
4. [Architecture Analysis](#architecture-analysis)
5. [Adaptation Strategy](#adaptation-strategy)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Rule Adaptation Guidelines](#rule-adaptation-guidelines)
8. [Quality Criteria](#quality-criteria)
9. [Deliverables](#deliverables)
10.   [Success Metrics](#success-metrics)

---

## Project Overview

### Why This Project Exists

**The Problem:**

- Xano is built on PostgreSQL but adds an abstraction layer (XanoScript, visual builder, JSONB data model)
- AI agents don't understand Xano-specific optimizations and patterns
- Developers using Xano with AI assistance get generic SQL advice that doesn't translate well
- Supabase released excellent PostgreSQL best practices for agents, but they assume direct SQL access

**The Solution:**

- Adapt Supabase's 30+ PostgreSQL best practice rules for Xano's architecture
- Create Xano-specific XanoScript examples and UI guidance
- Provide clear before/after patterns with performance impact measurements

**The Impact:**

- AI agents generate optimized Xano code instead of generic PostgreSQL
- Developers get Xano-specific best practices automatically
- Reduced performance issues in Xano applications
- Better understanding of when to use JSONB vs Standard SQL format

---

## Background & Context

### Supabase Agent Skills

**Official Announcement:**

- Blog: https://supabase.com/blog/postgres-best-practices-for-ai-agents
- Skills.sh Repository: https://skills.sh/supabase/agent-skills/supabase-postgres-best-practices
- GitHub: https://github.com/supabase/agent-skills
- Reddit Discussion: https://www.reddit.com/r/Supabase/comments/1qrd447/agent_skills_for_postgres_best_practices_to_teach/

**Structure:**

- 30+ PostgreSQL best practice rules
- 8 categories with priority levels (CRITICAL, HIGH, MEDIUM, LOW)
- Each rule as Markdown file with bad/good SQL examples
- Includes EXPLAIN output and performance context

**Categories:**

1. **Query Performance** (CRITICAL) - `query-*` prefix
2. **Connection Management** (CRITICAL) - `conn-*` prefix
3. **Security & RLS** (CRITICAL) - `security-*` prefix
4. **Schema Design** (HIGH) - `schema-*` prefix
5. **Concurrency & Locking** (MEDIUM-HIGH) - `lock-*` prefix
6. **Data Access Patterns** (MEDIUM) - `data-*` prefix
7. **Monitoring & Diagnostics** (LOW-MEDIUM) - `monitor-*` prefix
8. **Advanced Features** (LOW) - `advanced-*` prefix

### Xano Architecture

**Core Platform:**

- Backend-as-a-Service built on PostgreSQL
- No-code/low-code visual builder for APIs and business logic
- XanoScript: Domain-specific language for advanced logic
- Built-in authentication, file storage, background tasks

**Database Layer:**

- PostgreSQL managed database (version varies by instance)
- Two data format options:
   - **JSONB Format** (default): `id` + `jsonb` column storing entire record
   - **Standard SQL Format**: Traditional relational columns
- Visual query builder + XanoScript + Direct Database Query block
- Foreign keys, relationships, indexes all supported

**Key Differences from Raw PostgreSQL:**

- Query abstraction through XanoScript
- Visual index creation (not SQL DDL)
- Addons replace manual SQL joins
- Limited direct SQL access (Premium feature: Direct Database Connector)
- Performance overhead from abstraction layer

---

## Key Resources & Links

### Xano Documentation

**Core Documentation:**

- Main Docs: https://docs.xano.com
- Database Documentation: https://docs.xano.com/the-database/database-basics/using-the-xano-database
- Database Performance: https://docs.xano.com/the-database/database-performance-and-maintenance
- Indexing Guide: https://docs.xano.com/the-database/database-performance-and-maintenance/indexing
- Direct Database Connector: https://docs.xano.com/xano-features/instance-settings/direct-database-connector
- Direct Database Query: https://docs.xano.com/the-function-stack/functions/database-requests/direct-database-query

**XanoScript Documentation:**

- XanoScript Home: https://docs.xano.com/xanoscript
- Key Concepts: https://docs.xano.com/xanoscript/key-concepts
- XanoScript for AI Tools: https://xano-997cb9ee.mintlify.app/xanoscript/ai-tools
- Custom Functions: https://xano-997cb9ee.mintlify.app/xanoscript/custom-functions

**Community Resources:**

- Xano Community: https://community.xano.com
- Xano Learn (Tutorials): https://www.xano.com/learn/
- Database Index Basics Tutorial: https://www.xano.com/learn/database-index-basics-speed-up-queries/
- Variables with Examples: https://www.xano.com/learn/xano-variables-with-examples/

**Third-Party Resources:**

- Bootstrapped Xano Guides: https://bootstrapped.app/guide/how-to-use-xanos-query-optimization-tools
- Query Optimization Guide: https://bootstrapped.app/guide/how-to-use-xanos-query-plan-optimization-for-large-datasets
- Qikbuild Performance Guide: https://www.qikbuild.com/blog/xano-performance-optimization-guide

### Supabase Resources

**Agent Skills:**

- GitHub Repository: https://github.com/supabase/agent-skills
- Skills.sh Page: https://skills.sh/supabase/agent-skills/supabase-postgres-best-practices
- Announcement Blog: https://supabase.com/blog/postgres-best-practices-for-ai-agents

---

## Architecture Analysis

### Xano Database Architecture Deep Dive

#### 1. Data Format Options

Since late 2025 all new Xano instances default to the SQL format, so we are not strictly restricted by the JSONB format.

**JSONB Format (Legacy):**

```sql
-- Internal PostgreSQL structure:
CREATE TABLE mvpw_<workspaceID>_<tableID> (
  id SERIAL PRIMARY KEY,
  data JSONB
);

-- Example record:
{
  "id": 1,
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "created_at": "2026-02-03T10:00:00Z"
  }
}
```

**Pros:**

- Flexible schema changes
- Fast writes
- Good for document-like data

**Cons:**

- Limited indexing (GIN indexes only, `contains` operator)
- Cannot use B-tree indexes on individual fields
- Partial indexes not supported
- SELECT \* always returns full record (no field-level optimization)

**Standard SQL Format (default):**

```sql
-- Traditional relational structure:
CREATE TABLE x_<workspaceID>_<tableID> (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  age INTEGER,
  created_at TIMESTAMP
);
```

**Pros:**

- Full indexing support (B-tree, partial, composite)
- Native SQL query optimization
- Efficient field selection
- Better for complex queries and joins

**Cons:**

- Schema changes require migration
- Less flexible for varying data structures

**Recommendation for Agent Skills:**

- Document both formats separately
- Recommend Standard SQL for performance-critical applications
- Note JSONB limitations in each applicable rule

#### 2. XanoScript Query Language

**Syntax Comparison:**

| Operation         | PostgreSQL                                                           | XanoScript                                                                             |
| ----------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Select All**    | `SELECT * FROM users`                                                | `db.query user { return = {type: "list"} }`                                            |
| **Filter**        | `WHERE age > 25`                                                     | `db.query user { filter = "age > ?", 25 }`                                             |
| **Single Record** | `SELECT * FROM users WHERE id = 1 LIMIT 1`                           | `db.get user { field_name = "id", field_value = 1 }`                                   |
| **Insert**        | `INSERT INTO users (name, email) VALUES (?, ?)`                      | `db.add user { name = "John", email = "john@..." }`                                    |
| **Update**        | `UPDATE users SET name = ? WHERE id = ?`                             | Via API endpoint with form data or Direct Query                                        |
| **Delete**        | `DELETE FROM users WHERE id = ?`                                     | Via API endpoint or Direct Query                                                       |
| **Join**          | `SELECT u.*, p.* FROM users u LEFT JOIN posts p ON u.id = p.user_id` | `db.query user { addon = { posts = { table: "post", filter: "user_id = user.id" } } }` |
| **Pagination**    | `LIMIT 50 OFFSET 0`                                                  | `db.query user { limit: 50, offset: 0 }`                                               |
| **Raw SQL**       | Direct execution                                                     | `db.raw "SELECT * FROM users WHERE age > ?"`                                           |

**Key XanoScript Patterns:**

```xanoscript
// Variable assignment
db.query user { return = {type: "list"} } as $users

// Filtering with pipes
$user.name | capitalize | trim

// Conditionals
if ($user.age >= 18) {
  // Adult logic
} else {
  // Minor logic
}

// Loops
foreach ($users) {
  each as $user {
    // Process each user
  }
}

// Addons (join alternative)
db.query user {
  return = {type: "list"}
  addon = {
    posts = { table: "post", filter: "user_id = user.id" },
    profile = { table: "profile", filter: "user_id = user.id" }
  }
} as $enriched_users
```

#### 3. Indexing in Xano

**Index Creation:**

- **UI-based**: Database → Table → Indexes tab → Create Index
- **No SQL DDL**: Cannot use `CREATE INDEX` in standard workflow
- **Direct Database Connector**: Can use raw SQL for advanced indexes (Premium)

**Index Types:**

1. **Index** - Standard B-tree index on single or composite columns
2. **Unique** - Enforces uniqueness constraint (e.g., email, slug)
3. **Spatial** - For geographic queries using PostGIS
4. **Search** - Full-text search using GIN index

**JSONB Format Indexing:**

- Automatic GIN index on `data` column
- Supports `contains` operator: `data @> '{"age": 30}'`
- Cannot index arbitrary JSON paths efficiently
- Workaround: Use Standard SQL format for performance-critical fields

**Composite Index Example:**

```
UI Steps:
1. Database → posts table → Indexes tab
2. Create Index
3. Field 1: user_id (ASC)
4. Add Field → created_at (DESC)
5. Type: Index
6. Save

SQL Equivalent (not visible to user):
CREATE INDEX idx_posts_user_created ON posts(user_id ASC, created_at DESC);
```

#### 4. Query Performance Patterns

**Xano-Specific Optimizations:**

1. **Use Addons Instead of Loops**

```xanoscript
// ❌ BAD: N+1 queries
db.query user { return = {type: "list"} } as $users
foreach ($users) {
  each as $user {
    db.query post { filter = "user_id = ?", $user.id } as $posts
    // Process posts
  }
}

// ✅ GOOD: Single query with addon
db.query user {
  return = {type: "list"}
  addon = { posts = { table: "post", filter: "user_id = user.id" } }
} as $users_with_posts
```

2. **Chain Filters in Single Block**

```xanoscript
// ❌ BAD: Multiple function blocks (slow)
$data | filter1:arg1
// Separate block:
$filtered1 | filter2:arg2
// Separate block:
$filtered2 | filter3:arg3

// ✅ GOOD: Chained filters (50% faster)
$data | filter1:arg1 | filter2:arg2 | filter3:arg3
```

3. **Paginate Large Datasets**

```xanoscript
// Always use LIMIT/OFFSET for large result sets
db.query user {
  return = {type: "list"}
  limit: 50,
  offset: var.page * 50
} as $users
```

4. **Avoid SELECT \* Pattern**

```xanoscript
// JSONB format: Limited optimization (data stored in single column)
// Best practice: Filter at API response level
response = $users | map "id,name,email"

// Standard SQL format: Use Direct Query with field selection
db.raw "SELECT id, name, email FROM users"
```

---

## Adaptation Strategy

### Four-Phase Processing Pipeline

#### Phase 1: Parse & Extract (Input Processing)

**Objective**: Collect and structure all Supabase PostgreSQL best practice rules

**Tasks:**

1. Crawl Supabase agent-skills GitHub repository
   - Clone: `git clone https://github.com/supabase/agent-skills.git`
   - Navigate to PostgreSQL best practices directory
   - Identify all rule Markdown files

2. Parse each rule file and extract:
   - Rule name and category (prefix: query-, schema-, security-, etc.)
   - Priority level (CRITICAL, HIGH, MEDIUM, LOW)
   - Bad SQL example
   - Good SQL example
   - EXPLAIN output (if present)
   - Performance metrics (query time, rows scanned, etc.)
   - Explanation and context
   - References and links

3. Create structured JSON/CSV database:

```json
{
   "rules": [
      {
         "id": "query-missing-indexes",
         "category": "query",
         "priority": "CRITICAL",
         "title": "Missing Indexes on Frequently Queried Columns",
         "bad_sql": "SELECT * FROM orders WHERE customer_id = 123;",
         "good_sql": "CREATE INDEX idx_orders_customer_id ON orders(customer_id);\nSELECT * FROM orders WHERE customer_id = 123;",
         "performance_impact": "10-100x faster",
         "explanation": "Without index, PostgreSQL scans entire table...",
         "references": ["https://..."]
      }
   ]
}
```

**Deliverable**: `supabase_rules_database.json` - Complete structured dataset of all rules

#### Phase 2: Analyze Applicability (Classification)

**Objective**: Determine which rules apply to Xano and how

**Classification Categories:**

1. **Directly Applicable** - Works in Xano with minimal changes
   - Examples: RLS policies, schema normalization, LIMIT/OFFSET
   - Action: Keep concept, adapt syntax to XanoScript
   - Estimated: ~30% of rules

2. **Requires Translation** - Core concept valid but needs Xano-specific approach
   - Examples: N+1 queries (use Addons), indexing (use UI), query optimization
   - Action: Rewrite with XanoScript examples and UI steps
   - Estimated: ~40% of rules

3. **Partially Applicable** - Some aspects relevant, others not
   - Examples: Connection pooling (Xano manages), partial indexes (needs Direct Query)
   - Action: Document applicable parts, note limitations
   - Estimated: ~20% of rules

4. **Not Applicable** - Doesn't fit Xano architecture
   - Examples: WAL tuning, replication settings, pgBouncer configuration
   - Action: Document as N/A with explanation
   - Estimated: ~10% of rules

**Tasks:**

1. Review each rule against Xano's architecture
2. Classify into one of four categories
3. Identify Xano equivalent pattern (if applicable)
4. Note JSONB vs Standard SQL format differences
5. Document gaps or limitations

**Deliverable**: `xano_applicability_matrix.csv` - Spreadsheet with classification and notes

#### Phase 3: Map to Xano Equivalents (Translation)

**Objective**: Create concrete Xano translations for applicable rules

**Translation Components:**

1. **XanoScript Code Examples**
   - Convert SQL to XanoScript syntax
   - Include variable assignments, filters, conditionals
   - Show both bad and good patterns

2. **Xano UI Steps**
   - Screenshot-style written instructions
   - Navigation: Database → Table → Indexes
   - Button clicks, field selections, configuration

3. **JSONB vs Standard SQL Guidance**
   - Document which format is better suited for this rule
   - Note limitations of each format
   - Provide migration guidance if format change recommended

4. **Direct Database Query Fallbacks**
   - For advanced features (CTEs, window functions, partial indexes)
   - Provide raw SQL with Direct Query block instructions
   - Note that this requires Premium tier

**Translation Template:**

```markdown
## Bad Pattern (Xano)

### XanoScript

[XanoScript code showing inefficient pattern]

### Xano UI Steps (if applicable)

1. Step 1
2. Step 2

### SQL Equivalent (for reference)

[Raw SQL showing what's happening under the hood]

## Good Pattern (Xano)

### XanoScript

[Optimized XanoScript code]

### Xano UI Steps

1. Step 1: Database → [table] → Indexes
2. Step 2: Create Index → Select field(s)
3. Step 3: Choose index type → Save

### SQL Equivalent (for reference)

[Raw SQL showing optimized query]

## JSONB Format Considerations

[Specific notes for JSONB data format]

## Standard SQL Format Considerations

[Specific notes for Standard SQL format]

## Performance Impact

- Before: [metric]
- After: [metric]
- Improvement: [percentage]
- Measured via: Xano Query Analytics
```

**Deliverable**: `xano_translations/` - Directory of translated examples for each applicable rule

#### Phase 4: Create Xano-Specific Rules (Output Generation)

**Objective**: Write complete rule Markdown files in Xano context

**Rule File Structure:**

````markdown
# Rule: xano-[category]-[concept]

**Category**: [Query Performance / Schema Design / etc.]
**Priority**: [CRITICAL / HIGH / MEDIUM / LOW]
**Applies To**: [JSONB Format / Standard SQL Format / Both]

## Original Supabase Rule

**Reference**: [Link to Supabase rule]
**PostgreSQL Concept**: [Brief description]

## Why This Matters in Xano

[Explanation of how Xano's architecture affects this rule]
[Impact of abstraction layer, data format choice, etc.]

## Xano Data Format Considerations

### JSONB Format

[Specific guidance, limitations, and recommendations]

### Standard SQL Format

[Specific guidance and advantages for this rule]

### Recommendation

[Which format is better for this optimization and why]

## Bad Pattern (Xano)

### XanoScript

```xanoscript
[Inefficient XanoScript code]
```
````

### Xano UI Steps

1. [Steps that lead to this pattern]

### SQL Equivalent (for reference)

```sql
[What's happening at PostgreSQL level]
```

### Why This Is Bad

- [Performance impact]
- [Resource waste]
- [Scalability concern]

## Good Pattern (Xano)

### XanoScript

```xanoscript
[Optimized XanoScript code]
```

### Xano UI Steps

1. [Step-by-step implementation]
2. [With navigation path]
3. [Field selections and configurations]

### SQL Equivalent (for reference)

```sql
[Optimized PostgreSQL query]
```

### Why This Is Better

- [Performance improvement]
- [Efficiency gain]
- [Scalability benefit]

## Implementation in Xano

### For JSONB Format

1. [Specific steps]
2. [Considerations]

### For Standard SQL Format

1. [Specific steps]
2. [Considerations]

### Using Direct Database Query (Advanced)

```xanoscript
db.raw "[SQL query]"
```

## Performance Monitoring

- **Tool**: Xano Query Analytics (Dashboard → Analytics)
- **Metrics to Track**: Response time, query frequency, error rate
- **Before/After Comparison**: [Expected improvement]

## Xano-Specific Gotchas

- [Limitation 1]
- [Edge case 2]
- [Workaround 3]

## Related Rules

- [Link to related Xano rule]
- [Link to related Xano rule]

## References

- [Supabase Original Rule]
- [Xano Documentation]
- [Community Resources]

## Testing Checklist

- [ ] Documented edge cases and limitations
- [ ] Reviewed by Xano community expert

**Deliverable**: `skills/xano-database-best-practices/SKILL.md` - and similar directory of complete Xano rule Markdown files

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Week 1: Data Collection**

- [ ] Research Supabase agent-skills repository
- [ ] Parse all PostgreSQL best practice rule files
- [ ] Extract structured data (SQL examples, metrics, explanations)
- [ ] Create `supabase_rules_database.json`
- [ ] Set up Xano test instance for validation
- [ ] Document Xano instance configuration (JSONB vs SQL format)

**Week 2: Classification & Analysis**

- [ ] Review each Supabase rule against Xano architecture
- [ ] Classify into: Directly Applicable / Requires Translation / Partially Applicable / Not Applicable
- [ ] Create `xano_applicability_matrix.csv` with classifications
- [ ] Document initial observations about Xano limitations
- [ ] Identify rules requiring JSONB vs SQL format differentiation
- [ ] Prioritize rules by impact (start with CRITICAL category)

**Deliverables:**

- `supabase_rules_database.json` - Structured rule database
- `xano_applicability_matrix.csv` - Classification matrix

### Phase 2: Core Rule Adaptation (Weeks 3-6)

**Week 3: Query Performance Rules (`query-*`)**

- [ ] Adapt `query-missing-indexes` - Index creation via Xano UI
- [ ] Adapt `query-n-plus-one` - Use Addons pattern
- [ ] Adapt `query-select-star` - Field selection optimization
- [ ] Adapt `query-missing-limit-offset` - Pagination patterns
- [ ] Adapt `query-full-table-scan` - Query filtering and indexing
- [ ] Test all adaptations in Xano instance (both formats)
- [ ] Measure performance improvements using Query Analytics

**Week 4: Schema Design Rules (`schema-*`)**

- [ ] Adapt `schema-normalization` - Relationship design in Xano
- [ ] Adapt `schema-data-types` - Xano data type selection
- [ ] Adapt `schema-foreign-keys` - Foreign key setup in Xano UI
- [ ] Adapt `schema-constraints` - Unique, NOT NULL, CHECK constraints
- [ ] Adapt `schema-partial-indexes` - Direct Query workaround
- [ ] Test schema patterns in both JSONB and SQL formats
- [ ] Document migration patterns between formats

**Week 5: Security & RLS Rules (`security-*`)**

- [ ] Adapt `security-rls-enabled` - RLS setup in Xano
- [ ] Adapt `security-rls-policies-tested` - Testing RLS policies
- [ ] Adapt `security-sql-injection` - XanoScript parameterization
- [ ] Adapt `security-permissions` - Xano authentication and authorization
- [ ] Test security patterns with Direct Database Connector
- [ ] Document integration with Xano auth system

**Week 6: Review & Refinement**

- [ ] Review all Phase 2 adaptations for consistency
- [ ] Validate XanoScript syntax in actual Xano instance
- [ ] Ensure UI steps are accurate (screenshots if needed)
- [ ] Test performance claims with Query Analytics
- [ ] Gather feedback from Xano community (post to forums)
- [ ] Revise based on feedback

**Deliverables:**

- `skills/xano-db-best-practices/query/` - Query performance rules (5-8 files)
- `skills/xano-db-best-practices/schema/` - Schema design rules (5-7 files)
- `skills/xano-db-best-practices/security/` - Security rules (3-5 files)
- `performance_benchmarks.md` - Documented improvements
- `feedback_summary.md` - Community feedback notes

### Phase 3: Advanced Rules (Weeks 7-9)

**Week 7: Concurrency & Locking Rules (`lock-*`)**

- [ ] Adapt `lock-explicit-transactions` - Transaction handling in XanoScript
- [ ] Adapt `lock-optimistic-locking` - Version field pattern
- [ ] Adapt `lock-deadlock-prevention` - Transaction isolation guidance
- [ ] Adapt `lock-row-locking` - Direct Query patterns for locking
- [ ] Test transaction patterns in background tasks
- [ ] Document limitations and workarounds

**Week 8: Data Access Patterns (`data-*`)**

- [ ] Adapt `data-pagination` - Cursor vs offset pagination
- [ ] Adapt `data-eager-loading` - Addon pattern documentation
- [ ] Adapt `data-batch-operations` - Bulk insert/update patterns
- [ ] Adapt `data-caching` - Xano's built-in caching features
- [ ] Test patterns with large datasets (10k+ records)
- [ ] Measure performance impact

**Week 9: Monitoring & Diagnostics (`monitor-*`)**

- [ ] Adapt `monitor-slow-queries` - Query Analytics dashboard guide
- [ ] Adapt `monitor-query-plans` - Direct Database Connector EXPLAIN
- [ ] Adapt `monitor-performance-metrics` - Xano metrics and alerting
- [ ] Adapt `monitor-error-logging` - Debugging in Xano
- [ ] Create monitoring setup guide
- [ ] Document integration with external monitoring tools

**Deliverables:**

- `skills/xano-db-best-practices/lock/` - Concurrency rules (3-4 files)
- `skills/xano-db-best-practices/data/` - Data access rules (4-5 files)
- `skills/xano-db-best-practices/monitor/` - Monitoring rules (3-4 files)
- `advanced_patterns.md` - Complex scenarios and workarounds

---

## Rule Adaptation Guidelines

### Rule-by-Rule Adaptation Process

For each Supabase rule, follow this systematic process:

#### Step 1: Understand the Original Rule

- Read Supabase rule completely
- Understand the PostgreSQL concept
- Note the bad pattern and why it's problematic
- Note the good pattern and why it's better
- Review performance metrics if provided

#### Step 2: Assess Xano Applicability

Ask these questions:

- Does this concept apply to Xano's managed PostgreSQL?
- Is this something users can control in Xano?
- Does Xano's abstraction layer affect this rule?
- Are there JSONB vs Standard SQL format differences?
- Can users implement this via UI, XanoScript, or Direct Query?

#### Step 3: Identify Xano Equivalent

Determine the Xano implementation approach:

- **Visual UI**: Can users accomplish this through Xano's interface?
- **XanoScript**: Does this require custom query logic?
- **Direct Query**: Does this need raw SQL access?
- **Addons**: Can Xano's Addon pattern solve this?
- **Not Possible**: Are there architectural limitations?

#### Step 4: Translate Examples

Create Xano-specific examples:

**Bad Pattern Translation:**

1. Identify the anti-pattern in Xano context
2. Write XanoScript code demonstrating the problem
3. Add UI steps if applicable
4. Explain why this is problematic in Xano
5. Note performance impact measurable in Query Analytics

**Good Pattern Translation:**

1. Rewrite using Xano best practices
2. Provide complete XanoScript implementation
3. Document UI steps for setup (indexes, RLS, etc.)
4. Explain why this is better
5. Provide expected performance improvement

#### Step 5: Document Format Differences

For JSONB and Standard SQL formats:

- Note which format is better suited for this rule
- Explain limitations of each format
- Provide format-specific implementation guidance
- Recommend format migration if appropriate

#### Step 6: Add Xano-Specific Context

Include:

- **Gotchas**: Xano-specific limitations or edge cases
- **Workarounds**: Alternative approaches if direct implementation not possible
- **Performance Monitoring**: How to measure improvement in Query Analytics
- **Related Rules**: Link to other applicable Xano rules
- **References**: Link to relevant Xano documentation

---

## Quality Criteria

### Rule Quality Checklist

Each adapted rule must meet these criteria:

#### Content Quality

- [ ] Original Supabase rule clearly referenced
- [ ] Xano context and impact explained
- [ ] Both bad and good patterns provided
- [ ] XanoScript syntax is correct and tested
- [ ] UI steps are accurate and complete
- [ ] Performance improvement quantified
- [ ] JSONB and SQL format considerations documented
- [ ] Gotchas and limitations noted
- [ ] References to Xano docs included

#### Technical Accuracy

- [ ] XanoScript code runs without errors in Xano
- [ ] UI navigation paths are correct
- [ ] SQL equivalents are accurate
- [ ] Performance claims validated in Query Analytics
- [ ] Security implications addressed
- [ ] Edge cases considered

#### Clarity & Usability

- [ ] Title clearly describes the rule
- [ ] Explanation uses plain language
- [ ] Examples are realistic and practical
- [ ] Code is well-commented
- [ ] Steps are numbered and sequential
- [ ] Terminology is consistent
- [ ] Formatting is clean and readable

#### Completeness

- [ ] All sections of template filled out
- [ ] Multiple examples provided where helpful
- [ ] Related rules linked
- [ ] References are comprehensive

### Package Quality Standards

#### Code Organization

- Consistent file naming: `xano-[category]-[concept].md`
- Clear directory structure by category
- README with table of contents
- License and contribution guidelines

#### Documentation Standards

- Installation instructions
- Quick start guide
- Full API reference
- Migration guides
- Troubleshooting section

#### Testing & Validation

- Syntax validation for XanoScript examples
- Link checking for external references
- Spell checking and grammar
- Technical review by Xano expert
- Community feedback integration

---

## Deliverables

### 1. Rule Database & Classification

**Files:**

- `supabase_rules_database.json` - Structured data of all Supabase rules
- `xano_applicability_matrix.csv` - Classification and mapping

**Contents:**

- 30+ parsed Supabase rules with metadata
- Classification into 4 applicability categories
- Xano equivalent patterns identified
- Priority and impact assessment

### 2. Adapted Rule Files

**Files:**

- `xano-agent-skills/query/` - 5-8 query performance rules
- `xano-agent-skills/schema/` - 5-7 schema design rules
- `xano-agent-skills/security/` - 3-5 security rules
- `xano-agent-skills/lock/` - 3-4 concurrency rules
- `xano-agent-skills/data/` - 4-5 data access rules
- `xano-agent-skills/monitor/` - 3-4 monitoring rules

**Each rule includes:**

- Complete Markdown file following template
- XanoScript code examples (tested)
- Xano UI implementation steps
- JSONB and Standard SQL format guidance
- Performance benchmarks
- References and links

**Contents:**

- Runnable XanoScript code snippets
- Before/after comparisons
- Performance measurement scripts
- Integration examples

---

## Risk Mitigation

### Potential Risks & Mitigation Strategies

**Risk 1: Xano Platform Changes**

- **Mitigation**: Regular monitoring of Xano changelog; version tagging of rules to Xano version
- **Contingency**: Maintain version branches for different Xano releases

**Risk 2: Incomplete or Inaccurate Translations**

- **Mitigation**: Thorough testing in real Xano instances; community review before publishing
- **Contingency**: Clear issue reporting system; rapid response to accuracy concerns

**Risk 3: Limited Adoption**

- **Mitigation**: Strong marketing push; engagement with Xano community; demonstrations of value
- **Contingency**: Pivot to Xano-internal documentation if external package doesn't gain traction

**Risk 4: Maintenance Burden**

- **Mitigation**: Clear contribution guidelines; active community engagement; automation of testing
- **Contingency**: Seek co-maintainers from community; potential Xano sponsorship

**Risk 5: JSONB vs SQL Format Confusion**

- **Mitigation**: Clear format indicators on every rule; decision guide prominently featured
- **Contingency**: Separate documentation tracks for each format

---

## Appendix

### Xano Data Format Decision Tree

Use this to determine which format recommendation to make for each rule:

```
Does the optimization rely on field-level indexing?
├─ YES → Recommend Standard SQL format
│         (B-tree indexes on individual columns)
│
└─ NO → Does it involve complex queries (joins, CTEs, window functions)?
        ├─ YES → Recommend Standard SQL format
        │         (Native SQL optimization, easier Direct Query)
        │
        └─ NO → Does schema change frequently?
                ├─ YES → JSONB format acceptable
                │         (Flexible schema changes)
                │
                └─ NO → Recommend Standard SQL format
                          (Better performance, more PostgreSQL features)
```

**General Recommendation:** Standard SQL format for most production applications; JSONB for prototyping or document-like data.

### XanoScript Syntax Quick Reference

**Database Operations:**

```xanoscript
// Query all records
db.query [table_name] { return = {type: "list"} } as $result

// Get single record
db.get [table_name] { field_name = "id", field_value = 1 } as $record

// Add record
db.add [table_name] { field1 = value1, field2 = value2 }

// Update (typically via API endpoint, not XanoScript)

// Delete (typically via API endpoint, not XanoScript)

// Raw SQL
db.raw "[SQL query]" as $result
```

**Filters:**

```xanoscript
$data | capitalize
$data | lowercase
$data | trim
$data | filter:key:value
$data | map:"field1,field2,field3"
$data | sort:field:asc
```

**Control Flow:**

```xanoscript
// Conditionals
if ($condition) {
  // True branch
} else {
  // False branch
}

// Loops
foreach ($array) {
  each as $item {
    // Process item
  }
}
```

**Addons:**

```xanoscript
db.query user {
  return = {type: "list"}
  addon = {
    posts = { table: "post", filter: "user_id = user.id" },
    profile = { table: "profile", filter: "user_id = user.id" }
  }
} as $enriched
```

### Performance Improvement Tracking Template

Use this template to measure and document performance improvements:

```markdown
## Performance Test: [Rule Name]

**Test Environment:**

- Xano Instance: [Free/Launch/Scale/Enterprise]
- Data Format: [JSONB/Standard SQL]
- Dataset Size: [number] records
- Test Date: [date]

**Test Scenario:**
[Description of what was tested]

**Before Optimization:**

- Query Time: [ms]
- Rows Scanned: [number]
- Memory Used: [if available]
- CPU Time: [if available]

**After Optimization:**

- Query Time: [ms]
- Rows Scanned: [number]
- Memory Used: [if available]
- CPU Time: [if available]

**Improvement:**

- Speed: [%] faster
- Efficiency: [%] fewer rows scanned
- Overall Impact: [HIGH/MEDIUM/LOW]

**Measured Via:**

- Xano Query Analytics: [Yes/No]
- Direct Database Connector: [Yes/No]
- External Monitoring: [Tool name if applicable]

**Notes:**
[Any observations, edge cases, or context]
```
