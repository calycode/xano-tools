---
description: Create a XanoScript scheduled task for background processing
mode: agent
---

Delegate to @xano-task-writer to create a XanoScript scheduled task.

**Context to include:**
- Task name and purpose
- Schedule frequency (daily, hourly, etc.)
- What operations the task should perform
- Any external APIs or notifications involved
- Error handling requirements

The agent will create a properly structured task file in `tasks/`.
