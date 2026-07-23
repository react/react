# React Project - Contribution Action Plan

**Created**: April 27, 2026  
**Status**: Ready for Contribution  
**Environment**: Windows (d:\Development\react)

---

## 📋 Project Summary

### Project Type: 
**Monorepo - JavaScript/TypeScript Library** (React + React DOM + React Compiler)

### Maintained By: 
**Meta Platforms (Facebook) - Open Source**

### Current Version: 
**React 19.2.1** (Released December 3, 2025)

### Technology Stack:
- **Language**: JavaScript, TypeScript, Flow
- **Package Manager**: Yarn 1.22.22
- **Build Tool**: Rollup 3.x + Babel 7.x
- **Test Framework**: Jest 29.x
- **Type System**: Flow + TypeScript

### Repository Size:
- **30+ Packages** in monorepo
- **1000+ Source Files**
- **200+ Test Fixtures** for compiler
- **60+ Dev Dependencies**

---

## 🚀 QUICK START CHECKLIST

### ✅ Pre-Contribution Setup

```bash
# 1. Install Node.js (LTS)
# Download: https://nodejs.org/
# Verify: node --version (should be v18+ or v20+)

# 2. Install Yarn globally
npm install -g yarn@1.22.22

# 3. Use existing React repo
cd d:\Development\react

# 4. Install dependencies
yarn install
# Time: 5-10 minutes (one-time)

# 5. Verify installation
yarn -v
node -v
```

### ✅ Build Verification

```bash
# Build React packages
yarn build
# Time: 10-15 minutes (first time)

# Run tests
yarn test
# Time: 5-10 minutes

# Both should complete WITHOUT errors
```

---

## 🎯 TOP 3 RECOMMENDED STARTING ISSUES

### #1: Improve Hook Error Messages ⭐ RECOMMENDED START
**Level**: 🟢 Easy  
**Time**: 1-2 hours  
**Impact**: Medium  
**PR Visibility**: High

**What**: Make `Invalid hook call` error message more helpful

**Why**: 
- Super common developer error
- Current message too generic
- Thousands of developers benefit

**Your Steps**:
1. Open `packages/react/src/ReactHooks.js`
2. Find `resolveDispatcher()` function (line ~28)
3. Update error message to:
   - Include hook name being called
   - Show component that called it
   - Add helpful link

**Example**:
```javascript
// BEFORE:
"Invalid hook call. Hooks can only be called..."

// AFTER:
"Invalid hook call: useState() called in MyComponent
 Hooks can only be called at the top level of a function component.
 See: https://react.dev/link/invalid-hook-call"
```

**Testing**:
- Write test case that trigger this error
- Verify new message appears
- Run: `yarn test react`

**Submit PR with**:
- Updated error message
- Test case showing improvement
- Before/after comparison

---

### #2: Fix ARIA 1.3 False Positive Warnings
**Level**: 🟢 Easy  
**Time**: 1-2 hours  
**Impact**: Low-Medium  
**PR Visibility**: Medium

**What**: Stop warning about valid ARIA 1.3 attributes

**Why**:
- Developers using modern standards get confused
- Easy win to reduce false warnings
- Good practice for updating standards

**Your Steps**:
1. Find ARIA attribute validation
2. Search file for: `"aria-"` or `"role"`
3. Add missing ARIA 1.3 attributes:
   - `aria-togglebutton`
   - `aria-modal`
   - Other new ARIA 1.3 attributes

**File Location**: 
- `packages/react-dom/src/` (search for ARIA handling)

**Testing**:
- Create test dengan new ARIA attributes
- Verify no warnings
- Run: `yarn test react-dom`

---

### #3: Create Compiler Test Fixtures 
**Level**: 🟡 Medium  
**Time**: 2-3 hours  
**Impact**: Medium  
**PR Visibility**: High

**What**: Add more test fixtures for React Compiler

**Why**:
- Compiler adalah fitur baru dan krusial
- More fixtures = better coverage
- Compiler team prioritize this

**Your Steps**:
1. Navigate: `compiler/packages/babel-plugin-react-compiler/src/__tests__/fixtures/compiler/`
2. Create new file: `my-test-case.js`
3. Add test scenario (e.g., conditional effects, nested closures)
4. Run: `yarn snap -u` (generate expected output)
5. Verify output looks correct

**Example Test Case**:
```javascript
// File: conditional-effects.js
function MyComponent({ flag }) {
  if (flag) {
    useEffect(() => {
      // Compiler should handle this properly
      console.log('effect');
    }, [flag]);
  }
  return <div>{flag}</div>;
}
```

**Expected Output**: Generate `.expect.md` file dengan compiled result

**Testing**:
- Run: `yarn snap -p conditional-effects.js -d`
- Verify debug output shows proper compilation
- Commit both .js and .expect.md files

---

---

## 📚 DETAILED CONTRIBUTION WORKFLOW

### Step-by-Step: Your First PR

#### PHASE 1: Setup (30 minutes)
```bash
# 1. Install Node.js & Yarn (if not done)
# 2. Install dependencies
cd d:\Development\react
yarn install

# 3. Create feature branch
git checkout -b fix/improve-hook-errors

# 4. Verify build
yarn build
yarn test  # Should all pass
```

#### PHASE 2: Understand Code (1-2 hours)
```
Read Related Files:
- packages/react/src/ReactHooks.js
- packages/react/__tests__/ReactHooks-test.js
- CHANGELOG.md (note error message improvements)

Ask Yourself:
- Why is current message unclear?
- What info would help developers?
- What stack trace would be useful?
```

#### PHASE 3: Write Test First (30 minutes)
```
Create: packages/react/__tests__/InvalidHookCall-test.js

Write test that:
1. Calls hook outside component
2. Checks error message content
3. Verifies helpful information is present

Example:
```javascript
test('invalid hook call error shows hook name', () => {
  // Setup that causes invalid hook call
  expect(() => {
    useState(0); // Call outside component
  }).toThrow(/useState/);
});
```
```

#### PHASE 4: Implement Fix (1-2 hours)
```javascript
// In packages/react/src/ReactHooks.js

function resolveDispatcher() {
  const dispatcher = ReactSharedInternals.H;
  if (__DEV__) {
    if (dispatcher === null) {
      // Get caller function name for better error
      const stack = new Error().stack;
      const hookName = extractHookName(stack);
      
      console.error(
        `Invalid hook call: ${hookName || 'Hook'} can only be called inside of the body of a function component.` +
        // ... rest of message with component context
      );
    }
  }
  return ((dispatcher: any): Dispatcher);
}
```

#### PHASE 5: Test & Verify (30 minutes)
```bash
# Run specific test
yarn test react --testNamePattern="invalid hook"

# Run full test suite
yarn test

# Run linting
yarn lint

# Format code
yarn prettier-all
```

#### PHASE 6: Create Pull Request (15 minutes)
```
1. Commit changes
   git add -A
   git commit -m "Improve invalid hook call error message"

2. Push to fork
   git push origin fix/improve-hook-errors

3. Create PR on GitHub with:
   - Clear title: "Improve invalid hook call error messages"
   - Description of changes
   - Before/after examples
   - Reference to issue/changelog
   - Testing steps

4. Wait for review
   - React team reviews (1-2 weeks typical)
   - May request changes
   - Once approved, merges!
```

---

## 🔧 IMPORTANT COMMANDS REFERENCE

### Development
```bash
yarn install              # Install dependencies
yarn build               # Build all packages
yarn build react/index   # Build specific package
```

### Testing
```bash
yarn test                           # Run all tests
yarn test react                     # Test specific package
yarn test --testNamePattern="name"  # Test matching pattern
yarn test --watch                   # Watch mode
```

### Compiler (if modifying compiler)
```bash
cd compiler
yarn snap                    # Run compiler tests
yarn snap --watch           # Watch mode
yarn snap -d -p "test.js"  # Debug specific test
yarn snap -u                # Update expected output
yarn snap minimize test.js  # Minimize test case
```

### Code Quality
```bash
yarn lint                # Lint check
yarn prettier-check     # Check formatting
yarn prettier-all       # Auto-format all files
yarn flow              # Type checking
yarn flow-ci           # CI type checking
```

### Useful Tools
```bash
# Extract error codes from your changes
yarn extract-errors

# Build for devtools
yarn build-for-devtools

# Check release dependencies
yarn check-release-dependencies
```

---

## 📊 Issue Categories & Difficulty

### 🟢 EASY (1-2 hours) - Perfect for First PR
- [ ] Improve error messages
- [ ] Update documentation/comments  
- [ ] Add ARIA attributes
- [ ] Create simple test fixtures
- [ ] Fix console warnings consistency

### 🟡 MEDIUM (3-5 hours) - Good for Second PR
- [ ] Fix useFormStatus nesting bug
- [ ] Improve hydration warnings
- [ ] Add TypeScript definitions
- [ ] Compiler improvements for common patterns
- [ ] Server Actions debugging

### 🔴 HARD (5-10+ hours) - For Experienced Contributors
- [ ] Async error boundary support
- [ ] Compiler support for computed properties
- [ ] Complex server-side rendering fixes
- [ ] Performance optimizations
- [ ] New feature implementation

---

## 🎓 LEARNING RESOURCES WHILE CONTRIBUTING

### Must Read:
1. ✅ [React Rules](https://react.dev/reference/rules) - Understand fundamentals
2. ✅ [React Design Principles](https://react.dev/) - Why React works this way
3. ✅ [Contributing Guide](https://legacy.reactjs.org/docs/how-to-contribute.html)

### Code Reading:
1. `packages/react/src/ReactHooks.js` - Hook implementations
2. `packages/react-reconciler/src/` - Rendering engine
3. `compiler/docs/DESIGN_GOALS.md` - Compiler architecture

### Discussion:
1. GitHub Issues for context
2. GitHub Discussions for questions
3. React Discord community

---

## ⚠️ COMMON PITFALLS TO AVOID

### ❌ DON'T:
- ❌ Modify API without discussion (breaking changes!)
- ❌ Skip testing
- ❌ Create huge PRs (one issue per PR)
- ❌ Ignore linting/formatting errors
- ❌ Assume your changes don't affect other packages

### ✅ DO:
- ✅ Start with small, focused changes
- ✅ Write tests BEFORE implementing fix
- ✅ Run full test suite before submitting
- ✅ Reference existing patterns in codebase
- ✅ Ask for help via discussions/issues

---

## 📅 TIMELINE EXPECTATIONS

```
Your PR Submission
        ↓ (1-3 days)
React Team Reviews
        ↓ (May request changes)
You Make Changes (1-2 iterations typical)
        ↓ (1-3 days)
Final Review & Approval
        ↓ (1-2 weeks)
Merged & Released!
        ↓
Shows in React Blog
```

---

## 🎉 YOUR FIRST PR SUCCESS CRITERIA

### You've Succeeded When:

✅ **Local**:
- Your fix works locally
- Tests pass: `yarn test`
- Code formatted: `yarn prettier-all`
- Lint clean: `yarn lint`

✅ **On GitHub**:
- PR created with clear description
- CI checks pass (GitHub Actions)
- Tests all pass
- No lint warnings

✅ **After Merge**:
- Your fix merged to main
- Appears in next React release
- Improvements live for millions of developers!

---

## 💬 GETTING HELP

### When Stuck:
1. Check existing issues - maybe someone solved it
2. Read related code - patterns in codebase
3. Ask on GitHub Discussions
4. Ask on React Discord

### Resources:
- **GitHub**: https://github.com/facebook/react
- **Issues**: https://github.com/facebook/react/issues
- **Discussions**: https://github.com/facebook/react/discussions
- **React Docs**: https://react.dev
- **Discord**: React community server

---

## ✅ FINAL CHECKLIST BEFORE YOUR FIRST PR

- [ ] Node.js & Yarn installed
- [ ] Dependencies installed with `yarn install`
- [ ] Code you want to fix identified and understood
- [ ] Test case written that reproduces issue
- [ ] Fix implemented
- [ ] Tests pass: `yarn test`
- [ ] Code formatted: `yarn prettier-all`
- [ ] Lint passes: `yarn lint`
- [ ] Git branch created: `git checkout -b fix/issue-name`
- [ ] Changes committed: `git add -A && git commit -m "message"`
- [ ] PR created on GitHub
- [ ] PR description includes issue reference
- [ ] Ready to handle feedback/changes

---

## 🎯 NEXT IMMEDIATE STEPS

```
TODAY:
1. ✅ Install Node.js (https://nodejs.org/)
2. ✅ Install Yarn: npm install -g yarn@1.22.22
3. ✅ Read SETUP_GUIDE.md (created for you)
4. ✅ Read BUGS_ANALYSIS.md (created for you)

TOMORROW:
5. Run: yarn install
6. Run: yarn build (verify setup works)
7. Pick one easy issue from BUGS_ANALYSIS.md
8. Read the relevant code file
9. Write a test case

LATER THIS WEEK:
10. Implement the fix
11. Test locally
12. Create your first PR!
```

---

**Prepared**: April 27, 2026  
**Status**: Ready to Contribute  
**Files Created**:
- ✅ SETUP_GUIDE.md
- ✅ BUGS_ANALYSIS.md  
- ✅ CONTRIBUTION_PLAN.md (this file)

**Next Action**: Install Node.js and Yarn, then run `yarn install`!

