## **1. Setup Command: Directory + Instance Structure**

- **Prompt user:**
  “Where do you want to scaffold your Xano workspace?”
  - Default: `xano-cli/{instanceName}`
- **Create directory structure:**
  - At minimum:
    ```
    xano-cli/
      {instanceName}/
        cli.config.json (instance-level)
        workspaceA/
          workspace.config.json
          apiGroupA/
            api-group.config.json
          apiGroupB/
            api-group.config.json
        workspaceB/
          workspace.config.json
          ...
    ```
- **Outcome:**
  User ends up with a **directory tree that mirrors Xano’s logical structure**.

---

## **2. Modular Configs: Instance, Workspace, API Group**

- **Instance-level config:**
  - General settings for the instance (Xano server, base URL, tokenRef, etc.)
- **Workspace-level config (optional, for overrides):**
  - Settings specific to a workspace (e.g., custom lint/test/process overrides)
- **API group-level config (optional):**
  - For per-group overrides or metadata
- **Each config is stored in its corresponding folder.**
- **Config inheritance:**
  - Workspace config overrides instance config, API group config can override workspace config.

---

## **3. Config Loading Logic**

- **For any command:**
  1. Discover project root by looking for `cli.config.json` upwards from `process.cwd()`.
  2. If inside a workspace folder, load and merge `workspace.config.json` over instance config.
  3. If inside an API group folder, load and merge `api-group.config.json` over workspace and instance configs.
  4. Use the merged config for context and command execution.

---

## **4. Output Paths Become Modular and Relative**

- All output paths in configs are **relative to their config’s directory** (no need for `{instance}` in templates).
- Example in `workspace.config.json`:
  ```json
  {
    "process": { "output": "repo/{branch}" },
    "lint": { "output": "lint/{branch}" }
  }
  ```
- CLI always resolves output relative to the config file’s directory.

---

## **5. Tokens Still Global**

- API tokens remain in a user-level global directory (e.g., `~/.xano-tools/tokens/`).
- Config files refer to `tokenRef`, not the secret itself.

---

## **6. Context Switching and Navigation**

- **Navigation implications:**
  - User’s current working directory determines which config(s) are loaded.
  - To operate on a specific API group or workspace, user must `cd` into the desired folder.
  - CLI can offer commands to list/navigate the structure (e.g., `xano-cli list-workspaces`).
- **Disallow switching instance context within a project (unless user changes directories).**
- **Allow workspace/branch/apigroup overrides only when in the correct context.**

---

## **7. Error Handling and Safeguards**

- **If config is missing or malformed:**
  Print clear error, suggest running setup or fixing config.
- **If user tries to scaffold in a non-empty or dangerous directory:**
  Warn and require confirmation.
- **Always document config file structure and inheritance.**

---

## **8. Documentation and Help**

- **Update CLI help/README:**
  - Explain config hierarchy and inheritance.
  - Show directory structure examples.
  - Document where to put overrides and how they work.

---

## **9. Example Scaffolding Output (after setup):**

```
my-xano-project/
  cli.config.json
  workspace1/
    workspace.config.json
    user-apis/
      api-group.config.json
    admin-apis/
      api-group.config.json
  workspace2/
    workspace.config.json
    ...
```

---

## **10. Optional: Migration Support**

- If you have users with old global configs, provide a migration tool to scaffold the new structure and move configs appropriately.

---

## **Summary Table**

| Step                        | What changes?                          | Why?                                        |
|-----------------------------|----------------------------------------|---------------------------------------------|
| Setup directory prompt      | Ask user for (or use default) folder   | Ensures safety, structure, portability      |
| Scaffold full structure     | Create instance/workspace/api-group dirs | Mirrors Xano, supports modular configs      |
| Modular configs             | Instance, workspace, api-group configs | Allows granular overrides, future-proof     |
| Relative output paths       | Paths always relative to config dir    | Moves with project, avoids absolute paths   |
| Global tokens               | No change                              | Security, usability                        |
| Context by cwd              | Commands use config(s) based on cwd    | Predictable, safe, git/npm-like UX         |
| No context switch in project| Disallow instance switch in a project  | Avoids accidental data overwrite           |
| CLI/docs update             | Update help & docs for new structure   | User education, onboarding                 |

---

## **Trade-Off: Navigation**

- **PRO:** Max flexibility, overrides, and clarity.
- **CON:** Users may need to `cd` into deeper folders to operate at the workspace or API group level (just like with `git` or `npm` in monorepos).
- **Possible improvement:**
  Offer commands like `xano-cli list` or `xano-cli cd workspace1` to help users navigate programmatically.

---

## **Conclusion**

- **This structure is robust, future-proof, and professional.**
- **It matches how modern dev tools (git, npm, Terraform) handle modular, project-based configs.**
- **It enables granular overrides, safe directory operations, and easy project moves/renames.**