# React · The library for web and native user interfaces

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/facebook/react/blob/main/LICENSE) [![npm version](https://img.shields.io/npm/v/react.svg?style=flat)](https://www.npmjs.com/package/react) [![(Runtime) Build and Test](https://github.com/facebook/react/actions/workflows/runtime_build_and_test.yml/badge.svg)](https://github.com/facebook/react/actions/workflows/runtime_build_and_test.yml) [![(Compiler) TypeScript](https://github.com/facebook/react/actions/workflows/compiler_typescript.yml/badge.svg?branch=main)](https://github.com/facebook/react/actions/workflows/compiler_typescript.yml) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://legacy.reactjs.org/docs/how-to-contribute.html#your-first-pull-request)

React is a JavaScript library for building user interfaces that can render on the web, on servers, and on native platforms (via React Native). This repository contains the React core (runtime), the compiler, and tooling used to build and test React itself.

- Website & docs: https://react.dev/
- Community & support: https://react.dev/community
- Contributing guide: https://legacy.reactjs.org/docs/how-to-contribute.html

---

## Table of Contents

- [Quick start](#quick-start)
- [Examples](#examples)
- [Monorepo layout](#monorepo-layout)
- [How to run / Development workflow](#how-to-run--development-workflow)
  - [Prerequisites](#prerequisites)
  - [Install dependencies](#install-dependencies)
  - [Build (release & dev channels)](#build-release--dev-channels)
  - [Run tests](#run-tests)
  - [Common scripts & tips](#common-scripts--tips)
- [Compiler (overview & Rust port)](#compiler-overview--rust-port)
- [Contributing](#contributing)
- [Security & reporting vulnerabilities](#security--reporting-vulnerabilities)
- [Maintainers & governance](#maintainers--governance)
- [License](#license)

---

## Quick start

Clone the repo and install dependencies:

```bash
git clone https://github.com/react/react.git
cd react
# This repository uses Yarn workspaces (classic Yarn 1.x)
yarn
