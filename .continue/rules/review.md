---
invokable: true
---

Review this code for potential issues, including:

- Correct Xano CLI command registration (commands are discoverable, correctly registered, and context is managed)
- Monorepo structure consistency (all packages properly separated, with clear interfaces and responsibilities)
- Adherence to TypeScript best practices, type safety, and explicit type usage
- Efficient and reliable automation in code generation, documentation, OAS, registry, backup, and testing workflows
- Clear separation between CLI, business logic (core), types, and utility functions
- Valid, up-to-date configuration, schema, and CI/CD scripts
- Readable, maintainable, and well-commented code (especially around CLI entrypoints and registry features)
- Secure handling of credentials, tokens, and configuration (especially when running local/GitHub Actions)
- Actions and scripts should not break if Xano metadata/API structure changes subtly
- Registry and codegen should be robust for large projects and handle edge cases (naming, conflicts, missing metadata)
- Documentation and CLI output should be clear and actionable for humans

Provide specific, actionable feedback for improvements.