[![Time invested](https://wakatime.com/badge/github/MihalyToth20/xano-community-cli.svg?style=social)](https://wakatime.com/badge/github/MihalyToth20/xano-community-cli)

# xano-community-cli

**A tool to improve dev experience with XANO, especially for teams where clarity, transparency, and version control is important. Furthermore, this cli should help automate currently manual apsects of XANO. Why a CLI when we have AI? I am bullish on the AI, but in all honesty using AI so much without proper human control can cause a lot of issues. The idea behind this CLI is to reduce the need of reliance on AI and that we have our most crucial parts (testing, documentation) in place in any case, environment, system, either in part of a git provider or local system. The goal is to make it flexible and if there's need, then obiously LLM-ready.**
_(Work In Progress)_

---

## 🚀 Quick Start

- Clone the repo
- Run
  ```
  pnpm install
  ```
- run the default command to see available options (you can use the shorthand alias: xcc)

  ```
  pnpm run xano-community-cli
  ```

- run the `xcc help` command to get more insight what is available so far.

  ```
  pnpm run xcc help
  ```

- run the `setup` command to setup the CLI and connect your XANO Instance (+ metadata API)

  ```
  pnpm run xano-community-cli setup
  ```

- run the `generate-repo` to generate a 'repo' from your XANO workspace

  ```
  pnpm run xano-community-cli process
  ```

- see the output in the `output/` directory.

---

## 🤔 Why converting to Repo-like structure instead of just XANO UI?

XANO visual UI is extremely helpful for the lesser technical people, who are willing to read through and click through each step.
However, the UX of XANO in terms of navigating through each step and in the meantime potentially loosing context can become
cumbersome in some more complex logic and make it more difficult to grasp what's going on.
This is the reason why we try to traverse the XANO instance into a Github-like repo structure, which makes it
much more consumable in Code editors and IDEs. This may also result with a much easier integration with LLMs, which tend to
understand markdown or yaml (xanoscript) better than extremely verbose json objects.

---

## 🤖 Using in GitHub Actions

You can use this CLI as a GitHub Action to automate your Xano workflows.

### Using with a Private NPM Package

Our XCC is published to a private npm registry, so you need to configure your workflow to authenticate before calling the action.
Here is an example Github Action workflow that sets up an expected node environment.

```yaml
jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: read # Required for GitHub Packages

    steps:
      - uses: actions/checkout@v4

      # 1. Setup Node.js and authenticate to the private registry
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          # [ ] TODO: update the registry url to the actual registry...
          registry-url: 'https://your-private-registry.com'

      # 2. Use the Xano CLI Action
      - name: Run Xano Commands
        uses: MihalyToth20/xano-community-cli@v1
        with:
          # Choose the instance name as you wish:
          instance-name: 'production'
          instance-url: ${{ secrets.XANO_URL }}
          api-token: ${{ secrets.XANO_API_TOKEN }}
          version: '0.1.1'
          run: |
            generate-oas --all
        env:
          # For npm registries, use a personal access token (PAT) stored as a secret
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 🗂️ Structure of exports

- Each **`app`** in [`repo/`](repo/) is an API group (see [`repo/app/`](repo/app/)).
- **Functions** (service-like logic) are in [`repo/function/`](repo/function).
- Every major entity is parsed into its own path with a descriptive `.json` file and a README.
- WIP: we will be extracting the Xano Script versions of each endpoint after figuring out how to actually map the exports to the required metadata api inputs

---

## 🚧 Status

> **WORK IN PROGRESS:**
> Expect frequent changes!
> - Main entities (queries, functions, tables) are now parsed into their own paths and documented.
> - Plans to support dynamic setup
> - !!! The Github Actions workflows are copies from our live system, so they are not at all refactored to this new cli-like repo. They depend on a much less clear and messy node script implementation that fetches workspace files from GCP and then processes them as Github Action.

---

## 📝 Notes

- We use **pnpm** for performance and disk efficiency.

---

## ✔️ What Works Now?

- [x] Allow multi-user multi workspace setup.
- [x] Add context-switching to the configuration options.
- [x] Generate improved OpenAPI sepcification + Scalar Reference html (hostable anywhere and viewable locally).
- [x] Generate code fron the backend API groups, powered by openapi tools generator CLI.
- [x] Processing Xano queries, functions, and tables into a browsable repo structure
- [x] Automated test runner with assertion configuration
- [x] Linting with custom rulesets
- [x] Export and restore backups via Metadata API

---

## 🛠️ TODOs

- [x] Build Config file to configure non-secret configurations.
- [x] Create the CLI command handler.
- [x] Create a CLI setup walkthrough guide
- [x] Improve input handling (custom file locations for workspace.yaml, test.local.json, OAS specs, etc.)
- [x] Add the automated testing also to the configurable features
- [ ] Improve output handling (support custom output: `.zip`, directories, etc.)
- [ ] Bring the XANO default docs to the future with ajv. (AJV create schema from the Examples set in XANO + updated the OAS to v3.1, clean up the tags)
- [ ] Improve test runner and assertions to return a pretty (.md, .html, .json?) report with useful runtime information (duration, errors, etc)

---

**Contributions, feedback, and ideas are welcome!**
