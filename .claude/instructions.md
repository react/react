# React

**Scope**: All code EXCEPT `/compiler/` (compiler has its own instructions).

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `/packages/` | Publishable packages (react, react-dom, scheduler, etc.) |
| `/scripts/` | Build, test, and development scripts |
| `/fixtures/` | Test applications for manual testing |
| `/compiler/` | React Compiler (separate sub-project) |

## Key Packages

| Package | Purpose |
|---------|---------|
| `react` | Core React library |
| `react-dom` | DOM renderer |
| `react-reconciler` | Core reconciliation algorithm |
| `scheduler` | Cooperative scheduling |
| `react-server-dom-*` | Server Components |
| `react-devtools-*` | Developer Tools |
| `react-refresh` | Fast Refresh runtime |

## Requirements

- **Node**: Must be installed. Stop and prompt user if missing.
- **Package Manager**: Use `yarn` only.

## Verification

**IMPORTANT**: Use `/verify` to validate all changes before committing.

## Commands

| Command  | Purpose              |
|----------|----------------------|
| `/fix`   | Lint and format code |
| `/test`  | Run tests            |
| `/flow`  | Type check with Flow |
| `/flags` | Check feature flags  |

## Building

Builds are handled by CI. Do not run locally unless instructed.
