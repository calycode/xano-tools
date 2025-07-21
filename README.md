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
- check the `src/config/xcc.config.js` file and adjust to your liking
- place a workspace.yaml (downloaded and extracted from XANO Metadata API) into the path which you specified in the config.
- run the default command to see available options

  ```
  pnpm run xano-community-cli
  ```

- run the `process` to generate a 'repo' from your XANO workspace

  ```
  pnpm run xano-community-cli process
  ```

- see the output in the path specified in your config.

---

## 🤔 Why converting to Repo-like structure instead of just XANO UI?

XANO visual UI is extremely helpful for the lesser technical people, who are willing to read through and click through each step.
However, the UX of XANO in terms of navigating through each step and in the meantime potentially loosing context can become
cumbersome in some more complex logic and make it more difficult to grasp what's going on. 
This is the reason why we try to traverse the XANO instance into a Github-like repo structure, which makes it 
much more consumable in Code editors and IDEs. This may also result with a much easier integration with LLMs, which tend to 
understand markdown or yaml (xanoscript) better than extremely verbose json objects.

---

### 🗂️ Structure of exports

- Each **`app`** in [`repo/`](repo/) is an API group (see [`repo/app/`](repo/app/)).
- **Functions** (service-like logic) are in [`repo/function/`](repo/function).
- Every major entity is parsed into its own path with a descriptive `.json` file and a README.

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

- [x] Linting with custom rulesets
- [x] Processing Xano queries, functions, and tables into a browsable repo structure

---

## 🛠️ TODOs

- [X] Build Config file to configure non-secret configurations.
- [X] Create the CLI command handler.
- [ ] Add the automated testing also to the configurable features
- [ ] Improve path handling (support custom output: `.zip`, directories, etc.)
- [ ] Improve input handling (custom file locations for workspace.yaml, test.local.json, OAS specs, etc.)
- [ ] Create a `.env.example`
- [ ] Create a CLI setup walkthrough guide
- [ ] Bring the XANO default docs to the future with ajv. (AJV create schema from the Examples set in XANO + updated the OAS to v3.1, clean up the tags)

---

**Contributions, feedback, and ideas are welcome!**
