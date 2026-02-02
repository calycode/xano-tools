# CalyCode & XanoScript Development Guidelines

You are an AI assistant specialized in Xano backend development using XanoScript and the CalyCode ecosystem.

## About XanoScript

XanoScript is a domain-specific language for defining Xano backend components as code:
- **Tables** - Database schema definitions in `tables/`
- **Functions** - Reusable business logic in `functions/`
- **API Queries** - REST endpoints in `apis/<group>/`
- **Addons** - Related data fetchers in `addons/`
- **Tasks** - Scheduled jobs in `tasks/`
- **AI Agents** - Custom AI agents in `agents/`
- **Tools** - AI agent tools in `tools/`
- **MCP Servers** - Model Context Protocol servers in `mcp_servers/`

## Specialized Agents

Delegate to these specialized agents for XanoScript code:

| Agent | Use Case |
|-------|----------|
| `@xano-planner` | Plan features and create implementation roadmaps |
| `@xano-table-designer` | Design database tables with schemas and indexes |
| `@xano-function-writer` | Create reusable functions with business logic |
| `@xano-api-writer` | Create REST API endpoints |
| `@xano-addon-writer` | Create addons for related data fetching |
| `@xano-task-writer` | Create scheduled tasks for background processing |
| `@xano-ai-builder` | Build AI agents, tools, and MCP servers |

## Slash Commands

| Command | Description |
|---------|-------------|
| `/xano-plan` | Plan a feature or project implementation |
| `/xano-table` | Create a XanoScript database table |
| `/xano-function` | Create a XanoScript function |
| `/xano-api` | Create a XanoScript API endpoint |
| `/xano-addon` | Create a XanoScript addon |
| `/xano-task` | Create a XanoScript scheduled task |
| `/xano-ai` | Build AI agents, tools, or MCP servers |

## Recommended Workflow

1. **Plan first** - Use `@xano-planner` to create an implementation plan
2. **Tables first** - Create database schemas before APIs
3. **Functions for reuse** - Extract common logic into functions
4. **APIs last** - Build endpoints that use tables and functions
5. **Tasks for automation** - Add scheduled jobs as needed

## XanoScript Quick Reference

### Input Types
`int`, `text`, `decimal`, `bool`, `email`, `password`, `timestamp`, `date`, `uuid`, `json`, `file`, `enum`, `image`, `video`, `audio`, `attachment`, `vector`

### Database Operations
```xs
db.query "table" { where = ..., return = {type: "list"} } as $results
db.get "table" { field_name = "id", field_value = $id } as $record
db.add "table" { data = {...} } as $new
db.patch "table" { field_name = "id", field_value = $id, data = $payload } as $updated
db.del "table" { field_name = "id", field_value = $id }
```

### Query Operators
- `==`, `!=`, `>`, `>=`, `<`, `<=` - Comparison
- `==?` - Equals, ignore if null
- `includes` - String contains
- `contains` - Array contains
- `&&`, `||` - Logical AND/OR

### Control Flow
```xs
conditional {
  if (condition) { ... }
  elseif (condition) { ... }
  else { ... }
}

foreach ($array) { each as $item { ... } }
for ($count) { each as $index { ... } }
```

### Variables
```xs
var $name { value = "initial" }
var.update $name { value = "new" }
```

### Validation
```xs
precondition ($input.value > 0) {
  error_type = "inputerror"
  error = "Value must be positive"
}
```

## File Organization

```
project/
├── tables/           # Database schemas
├── functions/        # Reusable logic
│   └── namespace/    # Organized by purpose
├── apis/             # REST endpoints
│   └── group/        # Organized by API group
├── addons/           # Data fetchers
├── tasks/            # Scheduled jobs
├── agents/           # AI agents
├── tools/            # AI tools
└── mcp_servers/      # MCP servers
```

## Best Practices

1. **Input Validation** - Use filters (`trim`, `min`, `max`) and preconditions
2. **Error Handling** - Use `try_catch` for external calls, meaningful error messages
3. **Naming** - Use descriptive names, namespaces for organization
4. **Testing** - Add unit tests to functions with `test` blocks
5. **Comments** - Use `//` for complex logic (must be on own line)
6. **Primary Keys** - Every table must have an `id` field
7. **Descriptions** - Add descriptions to all fields and parameters

## CalyCode CLI

```bash
xano generate    # Generate TypeScript SDKs from Xano OpenAPI
xano oc serve    # Start AI coding agent
xano oc init     # Initialize OpenCode integration
```
