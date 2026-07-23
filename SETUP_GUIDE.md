# React Project - Setup & Contribution Guide

**Created**: April 27, 2026

## 📋 Required Prerequisites

Before starting your contribution to React, ensure your system has:

### Required:
1. **Node.js** >= 16.x (LTS recommended)
   - Download from https://nodejs.org/
   - Recommended: Node 18.x or 20.x LTS
   - Check: `node --version`

2. **Yarn** v1.22.22 (EXACT version from package.json)
   - Install globally: `npm install -g yarn@1.22.22`
   - Check: `yarn --version`

3. **Git**
   - Already installed at: `C:\Program Files\Git\cmd`

4. **Python** (for build scripts)
   - Check: `python --version`
   - Needed for some build tools

### Optional but Recommended:
- **Visual Studio Code** (✅ Already have)
- **VSCode Extensions**:
  - ESLint
  - Prettier
  - Flow Language Support

---

## 🚀 Installation Steps

### Step 1: Install Node.js
```powershell
# Download and install from https://nodejs.org/
# Or use Windows Package Manager:
winget install OpenJS.NodeJS
```

### Step 2: Install Yarn
```bash
npm install -g yarn@1.22.22
```

### Step 3: Install React Dependencies
```bash
cd d:\Development\react
yarn install
```

Time: 5-10 minutes (depends on internet speed)

### Step 4: Build React
```bash
yarn build
```

Time: 10-15 minutes (first time)

### Step 5: Run Tests
```bash
yarn test
```

---

## 📊 Project Statistics

- **Packages**: 30+ packages in monorepo
- **Dependencies**: 60+ dev dependencies
- **Total Code Files**: 1000+ TypeScript/JavaScript files
- **Test Fixtures**: 200+ compiler fixtures
- **Build Output**: Multiple UMD/ESM/CJS builds

---

## 🎯 Good First Issues for Contributing

### Category 1: Bug Fixes (Medium)
Issues that have been identified and need fixing:

1. **Issue: useId() CSS selector validation**
   - Status: Fixed in 19.1.0
   - Changed from `:r123:` to `«r123»` format
   - Files: `packages/react/src/ReactHooks.js`

2. **Issue: Class component lifecycle compatibility**
   - Status: Investigation needed
   - React Compiler does not support class components
   - Impact: Need clear error messages for developers

3. **Issue: Suspense boundary hydration edge cases**
   - Status: Multiple fixes in 19.2.0
   - Files: `packages/react-dom/src/server/ReactDOMServerLegacy.js`

### Category 2: Compiler Improvements (Medium-Hard)
React Compiler improvements:

1. **Issue: Error messages clarity**
   - Improve error messages when compiler encounters unsupported patterns
   - Files: `compiler/packages/babel-plugin-react-compiler/src/Validation/`

2. **Issue: Performance in watch mode**
   - Compiler test runner can be faster
   - Files: `compiler/scripts/`

3. **Issue: Better debugging output**
   - `yarn snap -d` output can be more informative
   - Files: `compiler/packages/babel-plugin-react-compiler/`

### Category 3: Documentation (Easy-Medium)
Documentation improvements:

1. **Issue: Add more compiler examples**
   - Create fixture examples for common patterns
   - Folder: `compiler/packages/babel-plugin-react-compiler/src/__tests__/fixtures/compiler/`

2. **Issue: Contributing guide improvements**
   - Update CONTRIBUTING.md with more details
   - Current status: Minimal, links to external docs

3. **Issue: DevTools integration docs**
   - Document how to use React DevTools with React 19
   - Files: `packages/react-devtools-shared/src/`

---

## 🔧 Development Workflow

### Common Commands Cheat Sheet

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Build specific packages
yarn build react/index react-dom/index

# Run all tests
yarn test

# Run tests in watch mode (for specific package)
yarn test react

# Lint code
yarn lint

# Format code
yarn prettier-all

# Run Flow type checking
yarn flow

# Compiler-specific commands
cd compiler
yarn snap              # Run compiler tests
yarn snap --watch     # Watch mode
yarn snap -d -p "simple.js"  # Debug specific fixture
yarn snap minimize <file>    # Minimize test case

# Build for devtools
yarn build-for-devtools
```

### Recommended Workflow for Contributing

```
1. Find Issue di GitHub → copy issue number & description
2. Create Feature Branch → git checkout -b fix/issue-xxxx
3. Buat Test Case/Fixture → demonstrate the problem
4. Create PR dengan fixture only (draft)
5. Implement Fix → update source code
6. Run Tests → yarn test (make sure all pass)
7. Run Lint → yarn lint (no violations)
8. Create Final PR → ready for review
```

---

## 🐛 Known Issues That Can Be Fixed

### React Core (Estimated Difficulty: Medium)

| Issue | File Location | Difficulty | Status |
|-------|---------------|-----------|--------|
| useFormStatus not working with nested forms | `packages/react-dom/` | 🟡 Medium | open |
| useActionState naming ambiguity | `packages/react/` | 🟢 Easy | open |
| Suspense fallback timing edge case | `packages/react-reconciler/` | 🔴 Hard | open |
| Error boundary not catching async errors | `packages/react-reconciler/` | 🟡 Medium | open |

### React DOM (Estimated Difficulty: Easy-Medium)

| Issue | File Location | Difficulty | Status |
|-------|---------------|-----------|--------|
| hydration mismatch warnings unclear | `packages/react-dom/` | 🟢 Easy | open |
| nonce attribute not propagating | `packages/react-dom/` | 🟢 Easy | open |
| ARIA 1.3 attribute warnings false positive | `packages/react-dom/` | 🟡 Medium | open |

### React Compiler (Estimated Difficulty: Hard)

| Issue | File Location | Difficulty | Status |
|-------|---------------|-----------|--------|
| Conditional hook detection improvement | `compiler/packages/babel-plugin-react-compiler/` | 🔴 Hard | open |
| Better error messages for non-pure functions | `compiler/packages/babel-plugin-react-compiler/` | 🔴 Hard | open |
| Support for computed properties | `compiler/packages/babel-plugin-react-compiler/` | 🔴 Hard | open |

---

## 📋 File Structure for Contributing

### Most Important Files

```
packages/react/                    → Core React hooks & APIs
├── src/
│   ├── React.js                  → Main entry point
│   ├── ReactHooks.js             → All hooks implementation
│   └── ReactFiberHooks.js        → Fiber integration

packages/react-dom/                → DOM rendering
├── src/
│   ├── client/ReactDOMRoot.js    → Root rendering
│   ├── server/                    → SSR implementation
│   └── ReactDOM.js               → Main entry point

packages/react-reconciler/         → Rendering engine
├── src/
│   ├── ReactFiberBeginWork.js    → Main work loop
│   ├── ReactFiberCompleteWork.js → Completion phase
│   └── ReactFiberHooks.js        → Hook integration

compiler/packages/babel-plugin-react-compiler/src/
├── Entrypoint/
│   └── Pipeline.ts               → Compilation pipeline
├── HIR/                          → Intermediate representation
├── Inference/                    → Type & dependency inference
└── Validation/                   → Rules of React validation
```

### Test Fixtures Location
```
compiler/packages/babel-plugin-react-compiler/src/__tests__/fixtures/compiler/
├── error.todo-*.js               → Unsupported patterns (graceful bailout)
├── error.bug-*.js                → Known bugs
├── *.js                          → Test input
└── *.expect.md                   → Expected output
```

---

## ✅ Pre-Contribution Checklist

Before submit PR, ensure:

- [ ] Node.js dan Yarn sudah installed
- [ ] Dependencies sudah di-install dengan `yarn install`
- [ ] Code following React's style guide (auto-format dengan `yarn prettier-all`)
- [ ] Tests pass: `yarn test`
- [ ] Lint pass: `yarn lint`
- [ ] Created test fixture/case yang demonstrate changes
- [ ] Updated CHANGELOG.md jika feature/fix significant
- [ ] PR description jelas dan link ke issue
- [ ] No breaking changes untuk existing public API

---

## 🎓 Learning Resources

1. **Rules of React** - https://react.dev/reference/rules
2. **React Compiler Documentation** - `/compiler/docs/`
3. **Contributing Guide** - https://legacy.reactjs.org/docs/how-to-contribute.html
4. **GitHub Issues** - https://github.com/facebook/react/issues?q=is:issue+is:open+label:"good+first+issue"

---

## 💡 Tips untuk Success

1. **Start Small** - Mulai dari "easy" issues, build up to medium/hard
2. **Understand the Code** - Read surrounding code before making changes
3. **Test Thoroughly** - Write comprehensive tests untuk reproduksi
4. **Follow Patterns** - React codebase punya established patterns, ikuti!
5. **Ask Questions** - React team responsive di GitHub discussions
6. **Be Patient** - Code review can take several weeks, this is normal!

---

## 🔗 Useful Links

- Main Repo: https://github.com/facebook/react
- Issues Page: https://github.com/facebook/react/issues
- Good First Issues: https://github.com/facebook/react/issues?q=label:%22good%20first%20issue%22
- Discussions: https://github.com/facebook/react/discussions
- React Docs: https://react.dev
- React Blog: https://react.dev/blog

---

**Last Updated**: April 27, 2026
