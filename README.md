<div align="center">

# ⚛️ React

**A personal fork of [React](https://react.dev/) — the library for web and native user interfaces.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Fork of react/react](https://img.shields.io/badge/fork%20of-react%2Freact-61dafb?logo=react&logoColor=white)](https://github.com/react/react)
[![npm version](https://img.shields.io/npm/v/react.svg?style=flat)](https://www.npmjs.com/package/react)
[![Upstream CI](https://github.com/react/react/actions/workflows/runtime_build_and_test.yml/badge.svg)](https://github.com/react/react/actions/workflows/runtime_build_and_test.yml)
[![Compiler TypeScript](https://github.com/react/react/actions/workflows/compiler_typescript.yml/badge.svg?branch=main)](https://github.com/react/react/actions/workflows/compiler_typescript.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://legacy.reactjs.org/docs/how-to-contribute.html#your-first-pull-request)

[Official Docs](https://react.dev/learn) · [Tutorial](https://react.dev/learn/tutorial-tic-tac-toe) · [API Reference](https://react.dev/reference/react) · [Community](https://react.dev/community)

</div>

---

## 📖 Table of Contents

- [About this repository](#-about-this-repository)
- [Why React?](#-why-react)
- [Quick start](#-quick-start)
- [Examples](#-examples)
- [Repository structure](#-repository-structure)
- [Local development](#-local-development)
- [Keeping this fork in sync](#-keeping-this-fork-in-sync)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧭 About this repository

React-Vamp is a fork of the official [`react/react`](https://github.com/react/react) monorepo. I use it to study React's internals, experiment with the source, and practice the open-source contribution workflow.

> **Note:** This is **not** an official release channel. For production apps, install React from npm (`npm install react react-dom`) and follow the [official docs](https://react.dev/).

## ✨ Why React?

| Principle | What it means |
| --- | --- |
| **Declarative** | Describe the UI for each state; React efficiently updates the right components when data changes. Views become predictable and easier to debug. |
| **Component-Based** | Build encapsulated components that manage their own state, then compose them into complex UIs. Logic lives in JavaScript, not templates. |
| **Learn Once, Write Anywhere** | Use React on the web, render on the server with [Node](https://nodejs.org/en), and build mobile apps with [React Native](https://reactnative.dev/). No need to rewrite existing code to adopt it. |

## 🚀 Quick start

React is designed for gradual adoption — use as little or as much as you need:

- **Try it out:** the [Quick Start](https://react.dev/learn) guide.
- **Add to an existing project:** [Add React to an Existing Project](https://react.dev/learn/add-react-to-an-existing-project).
- **Start a new app:** [Create a New React App](https://react.dev/learn/start-a-new-react-project) with a full toolchain.

```bash
npm install react react-dom
```

## 💡 Examples

### Hello, React

```jsx
import { createRoot } from 'react-dom/client';

function HelloMessage({ name }) {
  return <div>Hello {name}</div>;
}

const root = createRoot(document.getElementById('container'));
root.render(<HelloMessage name="Taylor" />);
```

Renders "Hello Taylor" into the element with id `container`. The HTML-like syntax is [JSX](https://react.dev/learn#writing-markup-with-jsx) — optional, but it makes components far more readable.

### State with hooks

```jsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} {count === 1 ? 'time' : 'times'}
    </button>
  );
}
```

### Composing components

```jsx
function Avatar({ src, name }) {
  return <img className="avatar" src={src} alt={name} />;
}

function ProfileCard({ user }) {
  return (
    <article>
      <Avatar src={user.photo} name={user.name} />
      <h2>{user.name}</h2>
      <p>{user.bio}</p>
    </article>
  );
}
```

More live examples are on [react.dev](https://react.dev/).

## 🗂️ Repository structure

This is a monorepo. The main top-level folders:

```text
React-Vamp/
├── packages/     # Core packages: react, react-dom, react-reconciler, scheduler, ...
├── compiler/     # React Compiler (separate workspace)
├── fixtures/     # Small apps used for manual testing and bug reproduction
├── scripts/      # Build, release, lint, and test tooling
├── flow-typed/   # Flow type definitions for third-party libraries
├── .github/      # CI workflows and issue/PR templates
├── CHANGELOG.md
├── CONTRIBUTING.md
└── package.json
```

## 🛠️ Local development

**Prerequisites:** [Git](https://git-scm.com/), [Yarn](https://classic.yarnpkg.com/), and the Node.js version pinned in [`.nvmrc`](./.nvmrc) (use [nvm](https://github.com/nvm-sh/nvm): `nvm use`).

```bash
# 1. Clone
git clone https://github.com/Vampire0011/React-Vamp.git
cd React-Vamp

# 2. Use the pinned Node version and install dependencies
nvm use
yarn install

# 3. Build packages
yarn build

# 4. Run the test suite
yarn test

# 5. Lint and type-check
yarn lint
yarn flow
```

Check the `scripts` section of [`package.json`](./package.json) for the full list of commands, and see the [contributing guide](https://legacy.reactjs.org/docs/how-to-contribute.html) for details on testing individual packages.

## 🔄 Keeping this fork in sync

```bash
# One-time: add the original repo as "upstream"
git remote add upstream https://github.com/react/react.git

# Pull in the latest changes
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

You can also use the **Sync fork** button on the GitHub repo page.

## 📚 Documentation

The official documentation lives at **[react.dev](https://react.dev/)**:

- [Quick Start](https://react.dev/learn)
- [Tutorial: Tic-Tac-Toe](https://react.dev/learn/tutorial-tic-tac-toe)
- [Thinking in React](https://react.dev/learn/thinking-in-react)
- [Installation](https://react.dev/learn/installation)
- [Describing the UI](https://react.dev/learn/describing-the-ui)
- [Adding Interactivity](https://react.dev/learn/adding-interactivity)
- [Managing State](https://react.dev/learn/managing-state)
- [Advanced Guides](https://react.dev/learn/escape-hatches)
- [API Reference](https://react.dev/reference/react)
- [Where to Get Support](https://react.dev/community)

Spotted a docs issue? Send a pull request to [reactjs/react.dev](https://github.com/reactjs/react.dev).

## 🤝 Contributing

React's development happens in the open, and the community's bug fixes and improvements are what make it better. Contributions to the upstream project should go to [`react/react`](https://github.com/react/react).

- 📜 **[Code of Conduct](https://code.fb.com/codeofconduct)** — Meta has adopted a Code of Conduct that all participants are expected to follow. Please read it.
- 🧑‍💻 **[Contributing Guide](https://legacy.reactjs.org/docs/how-to-contribute.html)** — development process, proposing fixes and improvements, building and testing changes.
- 🌱 **[Good First Issues](https://github.com/react/react/labels/good%20first%20issue)** — bugs with a limited scope, ideal for getting familiar with the process.

**Workflow for this fork:**

1. Create a branch: `git checkout -b fix/short-description`
2. Make changes and add tests
3. Run `yarn test` and `yarn lint`
4. Commit with a clear message and open a pull request

## 📄 License

React is [MIT licensed](./LICENSE).

---

<div align="center">

⭐ If you find this fork useful for learning, consider giving it a star.

</div>
