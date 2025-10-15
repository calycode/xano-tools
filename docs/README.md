# @calycode/cli Docs

Supercharge your Xano workflow: automate backups, docs, testing, and version control—no AI guesswork, just reliable, transparent dev tools.

[//]: # 'ASCII art block for docs link'

```
+==================================================================================================+
|                                                                                                  |
|    ██████╗ █████╗ ██╗  ██╗   ██╗    ██╗  ██╗ █████╗ ███╗   ██╗ ██████╗      ██████╗██╗     ██╗   |
|   ██╔════╝██╔══██╗██║  ╚██╗ ██╔╝    ╚██╗██╔╝██╔══██╗████╗  ██║██╔═══██╗    ██╔════╝██║     ██║   |
|   ██║     ███████║██║   ╚████╔╝█████╗╚███╔╝ ███████║██╔██╗ ██║██║   ██║    ██║     ██║     ██║   |
|   ██║     ██╔══██║██║    ╚██╔╝ ╚════╝██╔██╗ ██╔══██║██║╚██╗██║██║   ██║    ██║     ██║     ██║   |
|   ╚██████╗██║  ██║███████╗██║       ██╔╝ ██╗██║  ██║██║ ╚████║╚██████╔╝    ╚██████╗███████╗██║   |
|    ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝       ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝      ╚═════╝╚══════╝╚═╝   |
|                                                                                                  |
+==================================================================================================+
```

[📚 **View CLI Documentation**](https://calycode.com/cli/docs)

# xano tools

**_(Work In Progress)_**

---

**A set of tools to improve dev experience with Xano, especially for teams where clarity, transparency, and version control is important. Furthermore, this CLI should help automate currently manual apsects of Xano. Why a CLI when we have AI? I am bullish on the AI, but in all honesty using AI so much without proper human control can cause a lot of issues. The idea behind this CLI is to reduce the need of reliance on AI and that we have our most crucial parts (version control, documentation, testing, code-generation, opinionated rules, etc.) in place in any case, environment, system, either in part of a git provider or local system. The goal is to make it flexible and if there's need, then obiously LLM-ready.**

---

## 🚀 [Dev] Quick Start

```
# 1. Clone the repo

# 2. Install dependencies
pnpm install

# 3. Build the CLI
pnpm build

# 4. Run any command
xano
```

> _(Optional)_ If you want the CLI globally available during development:
>
> ```
> pnpm link
> ```
>
> **Note:** If you use `pnpm link`, remember to `pnpm unlink --global` when done to avoid version confusion.

! See the [documentation](https://calycode.com/cli/docs) for available commands and arguments.

---

### Xano Registry **(WIP)**

I have been astonished by the shadcn/ui CLI and the core principles of code distribution implemented in that tool. While that is primarily for frontend developers, their attempt to generalise their registry pointed me into the direction where I have started rebuilding a registry system for Xano powered by `xanoscript`. The reason for this is to overcome the bugs of Xano Snippets, avoid dependency of external providers of Xano Actions and in general to allow any team to build their own registries with ease. These registries should also serve as guidance for LLMs to eventually start generating more and more reliable `xanoscript`.

<details>
<summary>How to use the registry feature?</summary>

1. Scaffold the registry or build it manually by obeying the schemas (https://calycode.com/schemas/registry/registry.json).
   ```
   xano registry-scaffold
   ```
2. Serve your registry locally or host it on an object storage (or [advanced] recreate a Xano api that would deliver the required JSON objects on demand --> this could allow you to add auth as well)

   ```
   xano serve-registry
   ```

3. Use the registry and it's content in `xano`
   ```
   xano registry-add --components <coma separated component names> --registry <registry url>
   ```

> [!NOTE] > **Notes:**
> Currently there is no way of automatically building the registry from a collection of `xanoscript` files, so this is why
> it is important to always keep the registry/definitions/index.json and the individual definition files in sync.
> Currently there is theoretic support for registry:function and registry:table components, registry:query but registry:snippet is planned to allow installing multiple items at once in predefined order.
> With the registry:snippet I aim to have a shot at fixing Xano's Snippets and make it searchable and reusable by also LLMs.

</details>

---

## 🚧 CLI Status

> **WORK IN PROGRESS:**
> Expect frequent _(potentially breaking)_ changes!

---

## ✔️ What Works Now?

-  [x] Allow multi-user multi workspace setup.
-  [x] Generate improved **OpenAPI sepcification + Scalar (as UI)** Reference html (hostable anywhere and viewable locally).
-  [x] **Generate code** from the backend API groups, powered by openapi tools generator CLI (orval with tanstack query support is coming).
-  [x] **Processing Xano** queries, functions, and tables **into a browsable repo** structure (Xano json, not yet `xanoscript`)
-  [x] **Export and restore backups** via Metadata API
-  [x] Exporting all available `xanoscript` from your instance via metadata API _\*(important note: not all pieces of logic can be exported via metadata API, this especially is fragile on older and bigger instances)_.
-  [x] **Scaffolding a registry** of reusable Xano components
-  [x] Adding components to Xano from a registry (only functions, tables, queries for now)
-  [x] Automated test runner with assertion configuration

---

**Contributions, feedback, and ideas are welcome!** Open an issue, or reach out to us on [our Discord](https://mee6.xyz/i/8a9p4ORFtm), on [State Change](https://statechange.ai/) or [Snappy Community](https://www.skool.com/@mihaly-toth-2040?g=snappy).


Need further help? Visit [GitHub](https://github.com/calycode/xano-tools) or reach out to Mihály Tóth on [State Change](https://statechange.ai/) or [Snappy Community](https://www.skool.com/@mihaly-toth-2040?g=snappy)