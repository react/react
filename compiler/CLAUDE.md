# React Compiler Knowledge Base

This document contains knowledge about the React Compiler gathered during development sessions. It serves as a reference for understanding the codebase architecture and key concepts.

## Project Structure

When modifying the compiler, you MUST read the documentation about that pass in `compiler/packages/babel-plugin-react-compiler/docs/passes/` to learn more about the role of that pass within the compiler.

- `packages/babel-plugin-react-compiler/` - Main compiler package
  - `src/HIR/` - High-level Intermediate Representation types and utilities
  - `src/Inference/` - Effect inference passes (aliasing, mutation, etc.)
  - `src/Validation/` - Validation passes that check for errors
  - `src/Entrypoint/Pipeline.ts` - Main compilation pipeline with pass ordering
  - `src/__tests__/fixtures/compiler/` - Test fixtures
    - `error.todo-*.js` - Unsupported feature, correctly throws Todo error (graceful bailout)
    - `error.bug-*.js` - Known bug, throws wrong error type or incorrect behavior
    - `*.expect.md` - Expected output for each fixture

## Running Tests

```bash
# Run all tests
yarn snap

# Run tests matching a pattern
# Example: yarn snap -p 'error.*'
yarn snap -p <pattern>

# Run a single fixture in debug mode. Use the path relative to the __tests__/fixtures/compiler directory
# For each step of compilation, outputs the step name and state of the compiled program
# Example: yarn snap -p simple.js -d
yarn snap -p <file-basename> -d

# Update fixture outputs (also works with -p)
yarn snap -u
```

## Linting

```bash
# Run lint on the compiler source
yarn workspace babel-plugin-react-compiler lint
```

## Formatting

```bash
# Run prettier on all files (from the react root directory, not compiler/)
yarn prettier-all
```

## Compiling Arbitrary Files

Use `yarn snap compile` to compile any file (not just fixtures) with the React Compiler:

```bash
# Compile a file and see the output
yarn snap compile <path>

# Compile with debug logging to see the state after each compiler pass
# This is an alternative to `yarn snap -d -p <pattern>` when you don't have a fixture file yet
yarn snap compile --debug <path>
```

## Minimizing Test Cases

Use `yarn snap minimize` to automatically reduce a failing test case to its minimal reproduction:

```bash
# Minimize a file that causes a compiler error
yarn snap minimize <path>

# Minimize and update the file in-place with the minimized version
yarn snap minimize --update <path>
```

## Version Control

This repository uses Sapling (`sl`) for version control. Sapling is similar to Mercurial: there is not staging area, but new/deleted files must be explicitly added/removed.

```bash
# Check status
sl status

# Add new files, remove deleted files
sl addremove

# Commit all changes
sl commit -m "Your commit message"

# Commit with multi-line message using heredoc
sl commit -m "$(cat <<'EOF'
Summary line

Detailed description here
EOF
)"
```

## Key Concepts

### HIR (High-level Intermediate Representation)

The compiler converts source code to HIR for analysis. Key types in `src/HIR/HIR.ts`:

- **HIRFunction** - A function being compiled
  - `body.blocks` - Map of BasicBlocks
  - `context` - Captured variables from outer scope
  - `params` - Function parameters
  - `returns` - The function's return place
  - `aliasingEffects` - Effects that describe the function's behavior when called

- **Instruction** - A single operation
  - `lvalue` - The place being assigned to
  - `value` - The instruction kind (CallExpression, FunctionExpression, LoadLocal, etc.)
  - `effects` - Array of AliasingEffects for this instruction

- **Terminal** - Block terminators (return, branch, etc.)
  - `effects` - Array of AliasingEffects

- **Place** - A reference to a value
  - `identifier.id` - Unique IdentifierId

- **Phi nodes** - Join points for values from different control flow paths
  - Located at `block.phis`
  - `phi.place` - The result place
  - `phi.operands` - Map of predecessor block to source place

### AliasingEffects System

Effects describe data flow and operations. Defined in `src/Inference/AliasingEffects.ts`:

**Data Flow Effects:**
- `Impure` - Marks a place as containing an impure value (e.g., Date.now() result, ref.current)
- `Capture a -> b` - Value from `a` is captured into `b` (mutable capture)
- `Alias a -> b` - `b` aliases `a`
- `ImmutableCapture a -> b` - Immutable capture (like Capture but read-only)
- `Assign a -> b` - Direct assignment
- `MaybeAlias a -> b` - Possible aliasing
- `CreateFrom a -> b` - Created from source

**Mutation Effects:**
- `Mutate value` - Value is mutated
- `MutateTransitive value` - Value and transitive captures are mutated
- `MutateConditionally value` - May mutate
- `MutateTransitiveConditionally value` - May mutate transitively

**Other Effects:**
- `Render place` - Place is used in render context (JSX props, component return)
- `Freeze place` - Place is frozen (made immutable)
- `Create place` - New value created
- `CreateFunction` - Function expression created, includes `captures` array
- `Apply` - Function application with receiver, function, args, and result

### Hook Aliasing Signatures

Located in `src/HIR/Globals.ts`, hooks can define custom aliasing signatures to control how data flows through them.

**Structure:**
```typescript
aliasing: {
  receiver: '@receiver',    // The hook function itself
  params: ['@param0'],      // Named positional parameters
  rest: '@rest',            // Rest parameters (or null)
  returns: '@returns',      // Return value
  temporaries: [],          // Temporary values during execution
  effects: [                // Array of effects to apply when hook is called
    {kind: 'Freeze', value: '@param0', reason: ValueReason.HookCaptured},
    {kind: 'Assign', from: '@param0', into: '@returns'},
  ],
}
```

**Common patterns:**

1. **RenderHookAliasing** (useState, useContext, useMemo, useCallback):
   - Freezes arguments (`Freeze @rest`)
   - Marks arguments as render-time (`Render @rest`)
   - Creates frozen return value
   - Aliases arguments to return

2. **EffectHookAliasing** (useEffect, useLayoutEffect, useInsertionEffect):
   - Freezes function and deps
   - Creates internal effect object
   - Captures function and deps into effect
   - Returns undefined

3. **Event handler hooks** (useEffectEvent):
   - Freezes callback (`Freeze @fn`)
   - Aliases input to return (`Assign @fn -> @returns`)
   - NO Render effect (callback not called during render)

**Example: useEffectEvent**
```typescript
const UseEffectEventHook = addHook(
  DEFAULT_SHAPES,
  {
    positionalParams: [Effect.Freeze],  // Takes one positional param
    restParam: null,
    returnType: {kind: 'Function', ...},
    calleeEffect: Effect.Read,
    hookKind: 'useEffectEvent',
    returnValueKind: ValueKind.Frozen,
    aliasing: {
      receiver: '@receiver',
      params: ['@fn'],              // Name for the callback parameter
      rest: null,
      returns: '@returns',
      temporaries: [],
      effects: [
        {kind: 'Freeze', value: '@fn', reason: ValueReason.HookCaptured},
        {kind: 'Assign', from: '@fn', into: '@returns'},
        // Note: NO Render effect - callback is not called during render
      ],
    },
  },
  BuiltInUseEffectEventId,
);

// Add as both names for compatibility
['useEffectEvent', UseEffectEventHook],
['experimental_useEffectEvent', UseEffectEventHook],
```

**Key insight:** If a hook is missing an `aliasing` config, it falls back to `DefaultNonmutatingHook` which includes a `Render` effect on all arguments. This can cause false positives for hooks like `useEffectEvent` whose callbacks are not called during render.

## Feature Flags

Feature flags are configured in `src/HIR/Environment.ts`, for example `enableJsxOutlining`. Test fixtures can override the active feature flags used for that fixture via a comment pragma on the first line of the fixture input, for example:

```javascript
// enableJsxOutlining @enableNameAnonymousFunctions:false

...code...
```

Would enable the `enableJsxOutlining` feature and disable the `enableNameAnonymousFunctions` feature.

## Rust Port (Active)

Work is tracked in `compiler/docs/rust-port/` with numbered plan docs.
Rust crates live in `compiler/crates/`.

### Before implementing from a plan:
- Run `git log --oneline --grep="<plan-name>"` to see what's already done
- Read the plan doc's Remaining Work / Status section
- Only implement what's actually remaining

### After implementing:
- Update the plan doc's status
- Run `/compiler-verify`
- Ensure `compiler/scripts/test-babel-ast.sh` passes

## Debugging Tips

1. Run `yarn snap -p <fixture>` to see full HIR output with effects
2. Look for `@aliasingEffects=` on FunctionExpressions
3. Look for `Impure`, `Render`, `Capture` effects on instructions
4. Check the pass ordering in Pipeline.ts to understand when effects are populated vs validated

## Error Handling and Fault Tolerance

The compiler is fault-tolerant: it runs all passes and accumulates errors on the `Environment` rather than throwing on the first error. This lets users see all compilation errors at once.

**Recording errors** — Passes record errors via `env.recordError(diagnostic)`. Errors are accumulated on `Environment.#errors` and checked at the end of the pipeline via `env.hasErrors()` / `env.aggregateErrors()`.

**`tryRecord()` wrapper** — In Pipeline.ts, validation passes are wrapped in `env.tryRecord(() => pass(hir))` which catches thrown `CompilerError`s (non-invariant) and records them. Infrastructure/transformation passes are NOT wrapped in `tryRecord()` because later passes depend on their output being structurally valid.

**Error categories:**
- `CompilerError.throwTodo()` — Unsupported but known pattern. Graceful bailout. Can be caught by `tryRecord()`.
- `CompilerError.invariant()` — Truly unexpected/invalid state. Always throws immediately, never caught by `tryRecord()`.
- Non-`CompilerError` exceptions — Always re-thrown.

**Key files:** `Environment.ts` (`recordError`, `tryRecord`, `hasErrors`, `aggregateErrors`), `Pipeline.ts` (pass orchestration), `Program.ts` (`tryCompileFunction` handles the `Result`).

**Test fixtures:** `__tests__/fixtures/compiler/fault-tolerance/` contains multi-error fixtures verifying all errors are reported.
