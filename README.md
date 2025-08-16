[![Time invested](https://wakatime.com/badge/github/MihalyToth20/xano-community-cli.svg?style=social)](https://wakatime.com/badge/github/MihalyToth20/xano-community-cli)

[//]: # (ASCII art block for docs link)
```
(\
\'\
 \'\     __________
 / '|   ()_________)
 \ '/    \ ~XCC~~~~ \
   \       \ ~DOCs~   \
   ==).      \__________\
  (__)       ()__________)
  
```
[📚 **View Full CLI Documentation**](docs/README.md)

# xano-community-cli

**_(Work In Progress)_**

---

**A tool to improve dev experience with XANO, especially for teams where clarity, transparency, and version control is important. Furthermore, this cli should help automate currently manual apsects of XANO. Why a CLI when we have AI? I am bullish on the AI, but in all honesty using AI so much without proper human control can cause a lot of issues. The idea behind this CLI is to reduce the need of reliance on AI and that we have our most crucial parts (version control, documentation, testing, code-generation, opinionated rules, etc.) in place in any case, environment, system, either in part of a git provider or local system. The goal is to make it flexible and if there's need, then obiously LLM-ready.**


---

## 🚀 Quick Start

1. Clone the repo
2. Install dependencies _(use npm or pnpm)_
    ```
    pnpm install
    ```
3. Build the CLI
    ```
    pnpm build
    ```
4. **Run the CLI:**
    - Using pnpm (recommended):
      ```
      pnpm exec xcc --help
      ```
    - Or using npx:
      ```
      npx xcc --help
      ```

5. _(Optional)_ If you want the CLI globally available during development:
    ```
    pnpm link
    ```
    > **Note:** If you use `pnpm link`, remember to `pnpm unlink --global` when done to avoid version confusion.

6. See the [documentation](/docs/README.md) for available commands and arguments.

## 🤖 Using in GitHub Actions

You can use this CLI as a GitHub Action to automate your Xano workflows.

Here is an example job that checks out your repository and uses the local composite action (`./dist/actions/master-action.yml`), which in turn securely downloads and runs the XCC CLI as npm package via the npx command.

```yaml
jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # 1. Setup Node.js and authenticate to the npm registry
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org' # This is the default, but being explicit is good practice

      # 2. Use the Xano CLI Action from your repository
      # This composite action handles setup and (multiple or single) command execution by calling the published npm package.
      - name: Run Xano Commands
        uses: ./dist/actions/master-action.yml
        with:
          # Xano Instance name, used to identify the created configuration during command execution
          instance-name: 'production'
          instance-url: ${{ secrets.XANO_URL }}
          # Xano Metadata API token. Make sure to set it up as a secret
          api-token: ${{ secrets.XANO_API_TOKEN }}
          version: 'latest' # or a specific version like '0.1.1'
          # You can specify multiple commands in new lines and the action will execute them in order.
          # See the [documentation](/docs/README.md) for command docs.
          run: |
            generate-oas --all
```

---

## 🚧 CLI Status

> **WORK IN PROGRESS:**
> Expect frequent _(potentially breaking)_ changes!

---

## ✔️ What Works Now?

- [x] Allow multi-user multi workspace setup.
- [x] Add context-switching to the configuration options.
- [x] Generate improved **OpenAPI sepcification + Scalar** Reference html (hostable anywhere and viewable locally).
- [x] **Generate code** from the backend API groups, powered by openapi tools generator CLI.
- [x] **Processing Xano** queries, functions, and tables **into a browsable repo** structure
- [x] **Export and restore backups** via Metadata API
- [x] Linting with custom rulesets
- [x] Automated test runner with assertion configuration

---

**Contributions, feedback, and ideas are welcome!** Open an issue, or reach out to me on [State Change](https://statechange.ai/) or [Snappy Community](https://www.skool.com/snappy).
