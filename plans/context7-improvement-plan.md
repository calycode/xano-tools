# Context7 Benchmark Improvement Plan

## Executive Summary

Based on the Context7 benchmark feedback, this plan outlines specific actions to improve documentation and achieve higher trust scores. The average score across 10 questions is **64.7/100**. Our goal is to raise this to **85+/100** by addressing documentation gaps.

## Current Score Analysis

| #   | Question Topic                 | Score  | Priority     | Key Issues                            |
| --- | ------------------------------ | ------ | ------------ | ------------------------------------- |
| 1   | Version control initialization | 95/100 | Low          | Minor `setup` vs `init` inconsistency |
| 2   | Add component to registry      | 44/100 | **Critical** | Missing registry workflow docs        |
| 3   | Boilerplate generation         | 29/100 | **Critical** | Wrong context - no scaffolding docs   |
| 4   | Documentation generation       | 97/100 | N/A          | Excellent                             |
| 5   | Test suite definition          | 92/100 | Low          | Strong, minor improvements            |
| 6   | Component integration          | 66/100 | **High**     | Lacks post-installation guidance      |
| 7   | Workflow automation            | 96/100 | N/A          | Excellent                             |
| 8   | XanoScript file structure      | 48/100 | **Critical** | No XanoScript syntax docs             |
| 9   | Complex business logic         | 33/100 | **Critical** | No implementation details             |
| 10  | Dependency/versioning          | 47/100 | **Critical** | No dependency resolution docs         |

---

## Action Plan

### Priority 1: Critical Issues (Scores < 50)

#### Issue #3: Boilerplate Generation (29/100)

**Problem:** Context7 is returning `generate codegen` (client library generation) when users ask about generating boilerplate for new Xano functions/APIs. There's no documentation for scaffolding new components.

**Solution:** Create new documentation explaining the complete development workflow.

**Actions:**

1. Create `docs/guides/scaffolding.md` - Guide for creating new Xano components
2. Document the `registry scaffold` command more thoroughly
3. Add examples of XanoScript templates for common patterns
4. Create `docs/guides/xanoscript-development.md` explaining how to write new components

**New Documentation Content:**

```markdown
# Scaffolding New Xano Components

## Creating New Functions

The Xano CLI doesn't generate boilerplate directly - instead, you:

1. **Use the registry scaffold command** to create a component template
2. **Write XanoScript** for your business logic
3. **Use registry add** to deploy to your Xano instance

### Quick Start

xano registry scaffold --output ./my-registry

This creates a registry structure with sample components you can modify.
```

---

#### Issue #2: Add Component to Registry (44/100)

**Problem:** Documentation shows how to add components FROM a registry TO Xano, but doesn't explain how to CREATE and PUBLISH components to a registry.

**Solution:** Create comprehensive registry authoring documentation.

**Actions:**

1. Create `docs/guides/registry-authoring.md` - Complete guide to creating registries
2. Expand `docs/commands/registry-scaffold.md` with full examples
3. Document the registry item schema with practical examples
4. Add workflow diagrams

**New Documentation Structure:**

```markdown
# Registry Authoring Guide

## Overview

Create shareable, reusable Xano components using the registry system.

## Complete Workflow

1. Scaffold a new registry: `xano registry scaffold --output ./my-registry`
2. Create component definition files (registry-item.json)
3. Write XanoScript for your components
4. Serve locally for testing: `xano serve registry --path ./my-registry`
5. Deploy components: `xano registry add component-name --registry http://localhost:5500`
6. Publish to team (host registry files on any static server)

## Registry Item Schema

[Full schema documentation with examples]
```

---

#### Issue #8: XanoScript File Structure (48/100)

**Problem:** No documentation explaining the XanoScript (.xs) file format, syntax, or how to write components.

**Solution:** Create documentation pointing to official Xano resources.

**Strategy:** We should NOT go deep into XanoScript internals. Instead, point users and LLMs to the official Xano documentation.

**Actions:**

1. Create `docs/guides/xanoscript.md` - Brief overview with links to official docs
2. Document supported entity types that the CLI can process
3. Link to official Xano XanoScript documentation: https://docs.xano.com/xanoscript/vs-code#usage
4. Explain how the CLI uses XanoScript (extraction, registry, etc.)

**New Documentation Content:**

```markdown
# XanoScript in Xano Tools

## Overview

XanoScript (.xs) is Xano's domain-specific language for defining backend logic.
For comprehensive XanoScript syntax and usage, refer to the official Xano documentation:
https://docs.xano.com/xanoscript/vs-code#usage

## How Xano Tools Uses XanoScript

The CLI can:
- Extract XanoScript from your Xano workspace (`xano generate xanoscript`)
- Include XanoScript in registry components
- Process XanoScript as part of repo generation

## Supported Entity Types

[List of entity types the CLI processes]
```

---

#### Issue #9: Complex Business Logic (33/100)

**Problem:** No documentation showing how to build complex, custom business logic components.

**Solution:** Create patterns and recipes documentation with practical tips and external resources.

**Actions:**

1. Create `docs/guides/patterns.md` - Common patterns and best practices
2. Include practical recommendations:
   - **Logging:** Use [Axiom.co](https://axiom.co) for production-grade logging
   - **Collaboration:** Use the [Calycode Extension](https://extension.calycode.com) for better team collaboration with Xano branching
3. Point to external comprehensive resources:
   - **StateChange.ai:** https://statechange.ai - Advanced Xano patterns and training
   - **XDM (Xano Development Manager):** https://github.com/gmaison/xdm - Community tooling
4. Explain limitations of standard Xano Snippets and how registry overcomes them

---

#### Issue #10: Dependency Management (47/100)

**Problem:** No documentation explaining how `registryDependencies` work, version management, or conflict resolution.

**Solution:** Document the dependency system.

**Actions:**

1. Add dependency section to `docs/guides/registry-authoring.md`
2. Document `registryDependencies` field behavior
3. Explain installation order and conflict handling
4. Add version tracking best practices

**New Documentation Content:**

```markdown
# Dependency Management

## How Dependencies Work

When installing a component with `xano registry add`, the CLI:

1. Reads the component's `registryDependencies` array
2. Recursively resolves all dependencies
3. Installs dependencies in the correct order
4. Skips already-installed components

## Declaring Dependencies

In your registry-item.json:
{
"name": "auth/jwt-verify",
"registryDependencies": ["utils/crypto", "utils/base64"]
}

## Version Tracking

Components track versions via the `meta.updated_at` field.
```

---

### Priority 2: High Issues (Scores 50-70)

#### Issue #6: Component Integration (66/100)

**Problem:** Documentation shows how to install components but not how to USE them after installation.

**Solution:** Add post-installation guidance.

**Actions:**

1. Expand `docs/commands/registry-add.md` with usage examples
2. Document how installed components appear in Xano
3. Add "next steps" section showing component usage
4. Provide integration examples

---

### Priority 3: Low Issues (Scores > 90)

#### Issue #1: Init Command Inconsistency (95/100)

**Problem:** Documentation mentions both `xano setup` and `xano init` with different parameter names (`--api-key` vs `--token`).

**Solution:** Audit and standardize documentation.

**Actions:**

1. Search all docs for `xano setup` references and update to `xano init`
2. Ensure `--token` is consistently used (not `--api-key`)
3. Update any examples in README or guides

---

## New Documentation Files

### Files to Create

| File                                | Purpose                            | Priority |
| ----------------------------------- | ---------------------------------- | -------- |
| `docs/guides/scaffolding.md`        | Creating new Xano components       | Critical |
| `docs/guides/registry-authoring.md` | Building and publishing registries | Critical |
| `docs/guides/xanoscript.md`         | XanoScript language reference      | Critical |
| `docs/guides/patterns.md`           | Complex business logic patterns    | Critical |
| `docs/guides/git-workflow.md`       | Version control best practices     | Medium   |

### Files to Update

| File                                 | Changes                              | Priority |
| ------------------------------------ | ------------------------------------ | -------- |
| `docs/commands/init.md`              | Add more examples, clarify workflow  | Low      |
| `docs/commands/registry-add.md`      | Add post-installation guidance       | High     |
| `docs/commands/registry-scaffold.md` | Add complete examples                | High     |
| `docs/_sidebar.md`                   | Add new guide links                  | High     |
| `context7.json`                      | Update rules for discoverability     | Medium   |
| `README.md`                          | Ensure consistent command references | Low      |

---

## Context7 Configuration Updates

Update `context7.json` rules to improve discoverability:

```json
{
   "rules": [
      "Use when required to run commands to backup a xano workspace",
      "Use when extracting xanoscript from Xano workspace",
      "Use when generating improved OpenAPI specification from Xano workspace",
      "Use when needed to generate client side code for a Xano backend",
      "Use when creating reusable Xano components with the registry system",
      "Use when scaffolding new Xano functions, APIs, or addons",
      "Use when setting up version control for Xano projects",
      "Use when running API tests against Xano endpoints",
      "Use when managing component dependencies in Xano registries"
   ]
}
```

---

## Implementation Timeline

### Phase 1: Critical Documentation (Week 1-2)

- [ ] Create `docs/guides/xanoscript.md`
- [ ] Create `docs/guides/registry-authoring.md`
- [ ] Create `docs/guides/scaffolding.md`
- [ ] Create `docs/guides/patterns.md`

### Phase 2: Enhancements (Week 2-3)

- [ ] Update `registry-add.md` with post-installation guidance
- [ ] Update `registry-scaffold.md` with complete examples
- [ ] Add dependency management documentation
- [ ] Update sidebar navigation

### Phase 3: Polish (Week 3-4)

- [ ] Audit for `setup` vs `init` inconsistencies
- [ ] Update `context7.json` rules
- [ ] Review and test all documentation links
- [ ] Re-run Context7 benchmark

---

## Success Metrics

| Question | Current | Target | Notes                 |
| -------- | ------- | ------ | --------------------- |
| Q1       | 95      | 98+    | Minor fix             |
| Q2       | 44      | 85+    | Major docs needed     |
| Q3       | 29      | 80+    | New scaffolding guide |
| Q4       | 97      | 97+    | Maintain              |
| Q5       | 92      | 95+    | Minor improvements    |
| Q6       | 66      | 85+    | Post-install guidance |
| Q7       | 96      | 96+    | Maintain              |
| Q8       | 48      | 85+    | XanoScript reference  |
| Q9       | 33      | 80+    | Patterns guide        |
| Q10      | 47      | 85+    | Dependency docs       |

**Target Average Score: 88.6/100** (up from 64.7/100)

---

## Notes

1. The XanoScript syntax documentation should reference Xano's official documentation where appropriate, as the CLI extracts and processes XanoScript but doesn't define the language itself. Official docs: https://docs.xano.com/xanoscript/vs-code#usage

2. Some low scores (Q3, Q9) are due to Context7 matching the wrong documentation sections. Better topic-specific guides will improve relevance matching.

3. The registry system is a key differentiator but is under-documented. Comprehensive registry docs will address multiple benchmark questions.

4. External resources to recommend:
   - **StateChange.ai:** https://statechange.ai - Comprehensive Xano training and patterns
   - **XDM:** https://github.com/gmaison/xdm - Community development manager
   - **Axiom.co:** https://axiom.co - Production logging for Xano
   - **Calycode Extension:** https://extension.calycode.com - Team collaboration with Xano branching

---

## Future Improvements (Low Priority)

### Registry Authoring Enhancements

**Goal:** Make it easier to author registry items.

**Ideas:**
1. Allow users to create snippets from existing Xano functions via CLI
2. Add `xano registry create` command to generate registry-item.json interactively
3. Provide templates for common component types
4. Integration with Xano VSCode extension for seamless development

**Status:** Low priority - focus on documentation first.
