# Rust Port Step 5: Babel Plugin (`babel-plugin-react-compiler-rust`)

## Goal

Create a new, minimal Babel plugin package (`babel-plugin-react-compiler-rust`) that serves as a thin JavaScript shim over the Rust compiler. The JS side does only three things:

1. **Pre-filter**: Quick name-based scan for potential React functions (capitalized or hook-like names)
2. **Invoke Rust**: Serialize the Babel AST, scope info, and resolved options to JSON; call the Rust compiler via NAPI
3. **Apply result**: Replace the program AST with the Rust-returned AST and forward logger events

All complex logic — function detection, compilation mode decisions, directives, suppressions, gating rewrites, import insertion, outlined functions — lives in Rust. This ensures the logic is implemented once and reused across future OXC and SWC integrations.

**Current status**: Implementation complete. All entrypoint logic ported to Rust: compile_program orchestration, shouldSkipCompilation, findFunctionsToCompile, getReactFunctionType/getComponentOrHookLike (with all name heuristics, callsHooksOrCreatesJsx, returnsNonNode, isValidComponentParams), directive parsing, suppression detection/filtering, ProgramContext (uid generation, import tracking), gating rewrites, import insertion. The actual per-function compilation (compileFn) returns a skip event pending full pipeline implementation.

**Prerequisites**: [rust-port-0001-babel-ast.md](rust-port-0001-babel-ast.md) (complete), [rust-port-0002-scope-types.md](rust-port-0002-scope-types.md) (complete), core compilation pipeline in Rust (in progress).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Babel                                                  │
│                                                         │
│  1. Parse source → Babel AST                            │
│  2. babel-plugin-react-compiler-rust                    │
│     ┌─────────────────────────────────────────────┐     │
│     │  JS Shim (~50 lines)                        │     │
│     │                                             │     │
│     │  a) Pre-filter: any capitalized/hook fns?   │     │
│     │  b) Pre-resolve: sources filter, reanimated,│     │
│     │     isDev → serializable options             │     │
│     │  c) Extract scope tree (rust-port-0002)     │     │
│     │  d) JSON.stringify(ast, scope, options)     │     │
│     │  e) Call Rust via NAPI                      │     │
│     │  f) Parse result, forward logger events     │     │
│     │  g) Replace program AST if changed          │     │
│     └──────────────┬──────────────────────────────┘     │
│                    │ JSON                                │
│     ┌──────────────▼──────────────────────────────┐     │
│     │  Rust Compiler (via napi-rs)                │     │
│     │                                             │     │
│     │  - shouldSkipCompilation                    │     │
│     │  - findFunctionsToCompile                   │     │
│     │    (all compilation modes, directives,      │     │
│     │     forwardRef/memo, suppressions, etc.)    │     │
│     │  - compileFn (full pipeline)                │     │
│     │  - gating rewrites                          │     │
│     │  - import insertion                         │     │
│     │  - outlined function insertion              │     │
│     │  - panicThreshold handling                  │     │
│     │                                             │     │
│     │  Returns: modified AST | null + events      │     │
│     └─────────────────────────────────────────────┘     │
│                                                         │
│  3. Babel continues with modified (or original) AST     │
└─────────────────────────────────────────────────────────┘
```

### Why This Split

The guiding principle is **implement once in Rust, integrate thinly per tool**. The current TS plugin has ~1300 lines of complex entrypoint logic (`Program.ts`, `Imports.ts`, `Gating.ts`, `Suppression.ts`, `Reanimated.ts`, `Options.ts`). If this logic stayed in JS, it would need to be reimplemented for OXC and SWC integrations. By moving it all to Rust:

- **Babel shim**: ~50 lines of JS
- **Future OXC integration**: ~50 lines of Rust (native `Traverse` trait, serialize to same JSON format)
- **Future SWC integration**: ~50 lines of Rust (native `VisitMut` trait, serialize to same JSON format)

Each integration only needs to: (1) do a cheap pre-filter, (2) serialize AST + scope to the Babel JSON format, (3) call `compile()`, (4) apply the result.

---

## Rust Public API

The Rust compiler exposes a single entry point. This extends the existing planned API from `rust-port-notes.md` with structured results:

```rust
/// Main entry point for the React Compiler.
///
/// Receives a full program AST, scope information, and resolved options.
/// Returns a CompileResult containing either a modified AST or null,
/// along with structured logger events.
#[napi]
pub fn compile(
    ast_json: String,
    scope_json: String,
    options_json: String,
) -> napi::Result<String> {
    let ast: babel_ast::File = serde_json::from_str(&ast_json)?;
    let scope: ScopeInfo = serde_json::from_str(&scope_json)?;
    let opts: PluginOptions = serde_json::from_str(&options_json)?;

    let result = react_compiler::compile_program(ast, scope, opts);

    Ok(serde_json::to_string(&result)?)
}
```

### Result Type

```rust
#[derive(Serialize)]
#[serde(tag = "kind")]
pub enum CompileResult {
    /// Compilation succeeded (or no functions needed compilation).
    /// `ast` is None if no changes were made to the program.
    Success {
        ast: Option<babel_ast::File>,
        events: Vec<LoggerEvent>,
    },
    /// A fatal error occurred and panicThreshold dictates it should throw.
    /// The JS shim re-throws this as a CompilerError.
    Error {
        error: CompilerErrorInfo,
        events: Vec<LoggerEvent>,
    },
}

#[derive(Serialize)]
pub struct CompilerErrorInfo {
    pub reason: String,
    pub description: Option<String>,
    pub details: Vec<CompilerErrorDetail>,
}
```

### Logger Events

Rust returns the same structured events as the current TS compiler. The JS shim forwards them to the user-provided logger:

```rust
#[derive(Serialize)]
#[serde(tag = "kind")]
pub enum LoggerEvent {
    CompileSuccess {
        fn_loc: Option<SourceLocation>,
        fn_name: Option<String>,
        memo_slots: u32,
        memo_blocks: u32,
        memo_values: u32,
        pruned_memo_blocks: u32,
        pruned_memo_values: u32,
    },
    CompileError {
        fn_loc: Option<SourceLocation>,
        detail: CompilerErrorDetail,
    },
    CompileSkip {
        fn_loc: Option<SourceLocation>,
        reason: String,
        loc: Option<SourceLocation>,
    },
    CompileUnexpectedThrow {
        fn_loc: Option<SourceLocation>,
        data: String,
    },
    PipelineError {
        fn_loc: Option<SourceLocation>,
        data: String,
    },
    // Note: Timing events are handled on the JS side (performance.mark/measure)
}
```

---

## Resolved Options

Options that involve JS functions or runtime checks (like `sources` filter, Reanimated detection) cannot cross the NAPI boundary. The JS shim pre-resolves these before calling Rust:

### JS-Side Resolution

| Option | JS Resolves | Rust Receives |
|--------|------------|---------------|
| `sources` | Calls `sources(filename)` or checks string array | `should_compile: bool` |
| `enableReanimatedCheck` | Calls `pipelineUsesReanimatedPlugin()` | `enable_reanimated: bool` |
| `isDev` (for `enableResetCacheOnSourceFileChanges`) | Checks `__DEV__` / `NODE_ENV` | `is_dev: bool` |
| `logger` | Kept on JS side | Not sent (events returned instead) |

### Serializable Options (Passed Directly to Rust)

```typescript
// Options that serialize directly to Rust
interface RustPluginOptions {
    // Pre-resolved by JS
    shouldCompile: boolean;
    enableReanimated: boolean;
    isDev: boolean;
    filename: string | null;

    // Passed through as-is
    compilationMode: 'infer' | 'syntax' | 'annotation' | 'all';
    panicThreshold: 'all_errors' | 'critical_errors' | 'none';
    target: '17' | '18' | '19' | { kind: 'donotuse_meta_internal'; runtimeModule: string };
    gating: { source: string; importSpecifierName: string } | null;
    dynamicGating: { source: string } | null;
    noEmit: boolean;
    outputMode: 'ssr' | 'client' | 'lint' | null;
    eslintSuppressionRules: string[] | null;
    flowSuppressions: boolean;
    ignoreUseNoForget: boolean;
    customOptOutDirectives: string[] | null;
    environment: EnvironmentConfig;
}
```

---

## JS Shim: `babel-plugin-react-compiler-rust`

### Package Structure

```
compiler/packages/babel-plugin-react-compiler-rust/
    package.json
    tsconfig.json
    src/
        index.ts          # Babel plugin entry point (main export)
        BabelPlugin.ts    # Program visitor, pre-filter, bridge call
        prefilter.ts      # Name-based React function detection
        bridge.ts         # NAPI invocation, JSON serialization
        scope.ts          # Babel scope → ScopeInfo extraction (from rust-port-0002)
        options.ts        # Option resolution (pre-resolve JS-only options)
```

### `BabelPlugin.ts` — Babel Plugin Entry Point

```typescript
import type * as BabelCore from '@babel/core';
import {hasReactLikeFunctions} from './prefilter';
import {compileWithRust} from './bridge';
import {extractScopeInfo} from './scope';
import {resolveOptions, type PluginOptions} from './options';

export default function BabelPluginReactCompilerRust(
    _babel: typeof BabelCore,
): BabelCore.PluginObj {
    return {
        name: 'react-compiler-rust',
        visitor: {
            Program: {
                enter(prog, pass): void {
                    const filename = pass.filename ?? null;

                    // Step 1: Resolve options (pre-resolve JS-only values)
                    const opts = resolveOptions(pass.opts, pass.file, filename);

                    // Step 2: Quick bail — should we compile this file at all?
                    if (!opts.shouldCompile) {
                        return;
                    }

                    // Step 3: Pre-filter — any potential React functions?
                    if (!hasReactLikeFunctions(prog)) {
                        return;
                    }

                    // Step 4: Extract scope info
                    const scopeInfo = extractScopeInfo(prog);

                    // Step 5: Call Rust compiler
                    const result = compileWithRust(
                        prog.node,
                        scopeInfo,
                        opts,
                        pass.file.ast.comments ?? [],
                    );

                    // Step 6: Forward logger events
                    if (pass.opts.logger && result.events) {
                        for (const event of result.events) {
                            pass.opts.logger.logEvent(filename, event);
                        }
                    }

                    // Step 7: Handle result
                    if (result.kind === 'error') {
                        // panicThreshold triggered — throw
                        const err = new Error(result.error.reason);
                        // Attach details for CompilerError compatibility
                        (err as any).details = result.error.details;
                        throw err;
                    }

                    if (result.ast != null) {
                        // Replace the entire program body with Rust's output
                        prog.replaceWith(result.ast);
                        prog.skip(); // Don't re-traverse
                    }
                },
            },
        },
    };
}
```

### `prefilter.ts` — Name-Based Pre-Filter

The pre-filter is intentionally loose. It checks only whether any function in the program has a name that *could* be a React component or hook. False positives (like `ParseURL` or `FormatDate`) are acceptable — Rust will quickly determine these aren't React functions and return `null`.

```typescript
import {NodePath} from '@babel/core';
import * as t from '@babel/types';

/**
 * Quick check: does this program contain any functions with names that
 * could be React components (capitalized) or hooks (useXxx)?
 *
 * This is intentionally loose — Rust handles the precise detection.
 * We just want to avoid serializing files that definitely have no
 * React functions (e.g., pure utility modules, CSS-in-JS, configs).
 */
export function hasReactLikeFunctions(
    program: NodePath<t.Program>,
): boolean {
    let found = false;
    program.traverse({
        // Skip classes — their methods are not compiled
        ClassDeclaration(path) { path.skip(); },
        ClassExpression(path) { path.skip(); },

        FunctionDeclaration(path) {
            if (found) return;
            const name = path.node.id?.name;
            if (name && isReactLikeName(name)) {
                found = true;
                path.stop();
            }
        },
        FunctionExpression(path) {
            if (found) return;
            const name = inferFunctionName(path);
            if (name && isReactLikeName(name)) {
                found = true;
                path.stop();
            }
        },
        ArrowFunctionExpression(path) {
            if (found) return;
            const name = inferFunctionName(path);
            if (name && isReactLikeName(name)) {
                found = true;
                path.stop();
            }
        },
    });
    return found;
}

function isReactLikeName(name: string): boolean {
    return /^[A-Z]/.test(name) || /^use[A-Z0-9]/.test(name);
}

/**
 * Infer the name of an anonymous function expression from its parent
 * (e.g., `const Foo = () => {}` → 'Foo').
 */
function inferFunctionName(
    path: NodePath<t.FunctionExpression | t.ArrowFunctionExpression>,
): string | null {
    const parent = path.parentPath;
    if (
        parent.isVariableDeclarator() &&
        parent.get('init').node === path.node &&
        parent.get('id').isIdentifier()
    ) {
        return (parent.get('id').node as t.Identifier).name;
    }
    if (
        parent.isAssignmentExpression() &&
        parent.get('right').node === path.node &&
        parent.get('left').isIdentifier()
    ) {
        return (parent.get('left').node as t.Identifier).name;
    }
    return null;
}
```

### `bridge.ts` — NAPI Bridge

```typescript
// The napi-rs generated binding
import {compile as rustCompile} from '../native';

import type {ResolvedOptions} from './options';
import type {ScopeInfo} from './scope';
import type * as t from '@babel/types';

export interface CompileSuccess {
    kind: 'success';
    ast: t.Program | null;
    events: Array<LoggerEvent>;
}

export interface CompileError {
    kind: 'error';
    error: {
        reason: string;
        description?: string;
        details: Array<unknown>;
    };
    events: Array<LoggerEvent>;
}

export type CompileResult = CompileSuccess | CompileError;

export type LoggerEvent = {
    kind: string;
    [key: string]: unknown;
};

export function compileWithRust(
    ast: t.Program,
    scopeInfo: ScopeInfo,
    options: ResolvedOptions,
    comments: Array<t.Comment>,
): CompileResult {
    // Attach comments to the AST for Rust (Babel stores them separately)
    const astWithComments = {...ast, comments};

    const resultJson = rustCompile(
        JSON.stringify(astWithComments),
        JSON.stringify(scopeInfo),
        JSON.stringify(options),
    );

    return JSON.parse(resultJson) as CompileResult;
}
```

### `options.ts` — Option Resolution

```typescript
import type * as BabelCore from '@babel/core';
import {
    pipelineUsesReanimatedPlugin,
    injectReanimatedFlag,
} from './reanimated'; // Thin copy or import from existing

export interface ResolvedOptions {
    // Pre-resolved by JS
    shouldCompile: boolean;
    enableReanimated: boolean;
    isDev: boolean;
    filename: string | null;

    // Pass-through
    compilationMode: string;
    panicThreshold: string;
    target: unknown;
    gating: unknown;
    dynamicGating: unknown;
    noEmit: boolean;
    outputMode: string | null;
    eslintSuppressionRules: string[] | null;
    flowSuppressions: boolean;
    ignoreUseNoForget: boolean;
    customOptOutDirectives: string[] | null;
    environment: Record<string, unknown>;
}

export type PluginOptions = Partial<ResolvedOptions> & Record<string, unknown>;

export function resolveOptions(
    rawOpts: PluginOptions,
    file: BabelCore.BabelFile,
    filename: string | null,
): ResolvedOptions {
    // Resolve sources filter (may be a function)
    let shouldCompile = true;
    if (rawOpts.sources != null && filename != null) {
        if (typeof rawOpts.sources === 'function') {
            shouldCompile = rawOpts.sources(filename);
        } else if (Array.isArray(rawOpts.sources)) {
            shouldCompile = rawOpts.sources.some(
                (prefix: string) => filename.indexOf(prefix) !== -1,
            );
        }
    } else if (rawOpts.sources != null && filename == null) {
        shouldCompile = false; // sources specified but no filename
    }

    // Resolve reanimated check
    const enableReanimated =
        (rawOpts.enableReanimatedCheck !== false) &&
        pipelineUsesReanimatedPlugin(file.opts.plugins);

    // Resolve isDev
    const isDev =
        (typeof __DEV__ !== 'undefined' && __DEV__ === true) ||
        process.env['NODE_ENV'] === 'development';

    return {
        shouldCompile,
        enableReanimated,
        isDev,
        filename,
        compilationMode: rawOpts.compilationMode ?? 'infer',
        panicThreshold: rawOpts.panicThreshold ?? 'none',
        target: rawOpts.target ?? '19',
        gating: rawOpts.gating ?? null,
        dynamicGating: rawOpts.dynamicGating ?? null,
        noEmit: rawOpts.noEmit ?? false,
        outputMode: rawOpts.outputMode ?? null,
        eslintSuppressionRules: rawOpts.eslintSuppressionRules ?? null,
        flowSuppressions: rawOpts.flowSuppressions ?? true,
        ignoreUseNoForget: rawOpts.ignoreUseNoForget ?? false,
        customOptOutDirectives: rawOpts.customOptOutDirectives ?? null,
        environment: rawOpts.environment ?? {},
    };
}
```

---

## What Rust Implements (from `Program.ts` and friends)

The following logic moves entirely from the TS entrypoint into Rust. Rust operates on the deserialized Babel AST and scope info, and returns a modified AST.

### From `Program.ts`

| Function | What It Does | Rust Module |
|----------|-------------|-------------|
| `shouldSkipCompilation` | Check sources filter (pre-resolved), check for existing `c` import from runtime module | `entrypoint/program.rs` |
| `findFunctionsToCompile` | Traverse program, skip classes, apply compilation mode, call `getReactFunctionType` | `entrypoint/program.rs` |
| `getReactFunctionType` | Determine if a function is Component/Hook/Other based on compilation mode, names, directives | `entrypoint/program.rs` |
| `getComponentOrHookLike` | Name-based heuristics + `callsHooksOrCreatesJsx` + `isValidComponentParams` + `returnsNonNode` + `isForwardRefCallback` + `isMemoCallback` | `entrypoint/program.rs` |
| `processFn` | Per-function: check directives (opt-in/opt-out), compile, check output mode | `entrypoint/program.rs` |
| `tryCompileFunction` | Check suppressions, call `compileFn`, handle errors | `entrypoint/program.rs` |
| `applyCompiledFunctions` | Replace original functions with compiled versions, handle gating, insert outlined functions | `entrypoint/program.rs` |
| `createNewFunctionNode` | Build replacement AST node matching original function type | `entrypoint/program.rs` |
| `handleError` / `logError` | Apply panicThreshold, log to events | `entrypoint/program.rs` |

### From `Imports.ts`

| Function | What It Does | Rust Module |
|----------|-------------|-------------|
| `ProgramContext` | Track compiled functions, generate unique names, manage imports | `entrypoint/imports.rs` |
| `addImportsToProgram` | Insert import declarations (or require calls) into program body | `entrypoint/imports.rs` |
| `validateRestrictedImports` | Check for blocklisted import modules | `entrypoint/imports.rs` |

### From `Gating.ts`

| Function | What It Does | Rust Module |
|----------|-------------|-------------|
| `insertGatedFunctionDeclaration` | Rewrite function with gating conditional (optimized vs unoptimized) | `entrypoint/gating.rs` |
| `insertAdditionalFunctionDeclaration` | Handle hoisted function declarations referenced before declaration | `entrypoint/gating.rs` |

### From `Suppression.ts`

| Function | What It Does | Rust Module |
|----------|-------------|-------------|
| `findProgramSuppressions` | Parse eslint-disable/enable and Flow suppression comments | `entrypoint/suppression.rs` |
| `filterSuppressionsThatAffectFunction` | Check if suppression ranges overlap a function | `entrypoint/suppression.rs` |
| `suppressionsToCompilerError` | Convert suppressions to compiler errors | `entrypoint/suppression.rs` |

### From `Reanimated.ts`

| Function | What It Does | Rust Module |
|----------|-------------|-------------|
| `injectReanimatedFlag` | Set `enableCustomTypeDefinitionForReanimated` in environment config | Pre-resolved by JS; Rust receives `enableReanimated: bool` |
| `pipelineUsesReanimatedPlugin` | Check if reanimated babel plugin is present | Pre-resolved by JS |

### From `Options.ts`

| Function | What It Does | Rust Module |
|----------|-------------|-------------|
| `parsePluginOptions` | Validate and parse plugin options | JS resolves, Rust re-validates serializable subset |
| Option types and schemas | Zod schemas for options | Rust serde types with validation |
| `LoggerEvent` types | Event type definitions | Rust enum (serialized back to JS) |

---

## NAPI Bridge Details

### Technology: napi-rs

The bridge uses [napi-rs](https://napi.rs/) to expose the Rust `compile` function to Node.js. This is the same approach used by SWC (`@swc/core`), Biome, and other Rust-based JS tools.

### Serialization: JSON Strings

The bridge passes JSON strings across the NAPI boundary. This is the simplest approach and provides several benefits:

- **Debuggable**: JSON can be logged, inspected, and round-trip tested
- **Consistent with existing infrastructure**: The `react_compiler_ast` crate already handles JSON serde with all 1714 test fixtures passing
- **No schema coupling**: The JS side doesn't need generated bindings — just `JSON.stringify`/`JSON.parse`
- **Adequate performance**: For file-level granularity (one call per file), JSON serialization overhead is negligible compared to compilation time

### Performance Considerations

The JSON serialization adds overhead, but it is bounded:

- **Serialization**: `JSON.stringify` of a typical program AST: ~1-5ms
- **Deserialization in Rust**: `serde_json::from_str`: ~1-5ms
- **Re-serialization in Rust**: `serde_json::to_string` of result: ~1-5ms
- **Parse in JS**: `JSON.parse` of result: ~1-5ms
- **Total overhead**: ~4-20ms per file
- **Compilation time**: Typically 50-500ms per file

The serialization overhead is 2-10% of total time. If this becomes a bottleneck, a future optimization could use `Buffer` passing with a binary format, but JSON is the right starting point.

### Native Module Structure

```
compiler/packages/babel-plugin-react-compiler-rust/
    native/
        Cargo.toml          # napi-rs crate
        src/
            lib.rs          # #[napi] compile function
        build.rs            # napi-rs build script
    npm/                    # Platform-specific npm packages (generated by napi-rs)
        darwin-arm64/
        darwin-x64/
        linux-x64-gnu/
        win32-x64-msvc/
        ...
```

---

## What Stays in JS vs What Moves to Rust

### JS Side (Thin Shim)

| Responsibility | Reason it stays in JS |
|---------------|----------------------|
| Pre-filter (name-based scan) | Avoids serialization for files with no React functions |
| Resolve `sources` filter | May be a JS function (not serializable) |
| Resolve Reanimated check | Requires `require.resolve` and Babel plugin list inspection |
| Resolve `isDev` | Requires `process.env` / `__DEV__` access |
| Extract scope info | Requires Babel scope API |
| Serialize AST/scope/options | Bridge responsibility |
| Forward logger events | Logger is a JS callback |
| Throw on fatal errors | JS exception mechanism |
| Replace program AST | Babel `path.replaceWith` API |
| Performance timing | `performance.mark/measure` API |

### Rust Side (Everything Else)

| Responsibility | Current TS Location |
|---------------|-------------------|
| `shouldSkipCompilation` (non-sources checks) | `Program.ts:782-816` |
| `findFunctionsToCompile` | `Program.ts:495-559` |
| `getReactFunctionType` | `Program.ts:818-864` |
| `getComponentOrHookLike` | `Program.ts:1049-1078` |
| All name/param/return heuristics | `Program.ts:897-1164` |
| `forwardRef`/`memo` detection | `Program.ts:951-970` |
| Directive parsing (`use memo`, `use no memo`, `use memo if(...)`) | `Program.ts:47-144` |
| Suppression detection and filtering | `Suppression.ts` (all) |
| Per-function compilation (`compileFn`) | `Pipeline.ts` |
| Gating rewrites | `Gating.ts` (all) |
| Import generation and insertion | `Imports.ts:225-306` |
| Outlined function insertion | `Program.ts:283-329` |
| `ProgramContext` (uid gen, import tracking) | `Imports.ts:64-209` |
| Error handling / panicThreshold | `Program.ts:146-222` |
| Option validation | `Options.ts:324-403` |

---

## Cross-Tool Strategy (OXC, SWC)

This architecture is designed to support future OXC and SWC integrations with minimal per-tool code.

### Common Boundary: Babel JSON AST

All integrations serialize to the same Babel JSON AST format that the `react_compiler_ast` crate expects. This means:

- **OXC integration**: A Rust transform that converts OXC's native AST → Babel JSON AST → calls `compile()` → converts result back to OXC AST. Since both are Rust, this can use the struct types directly (no JSON step needed for the Rust→Rust path — just type conversion).
- **SWC integration**: A Rust transform (native or WASM plugin) that converts SWC's AST → Babel JSON AST → calls `compile()` → converts result back.

### Scope Abstraction

Each tool provides scope information differently:
- **Babel**: Scope tree object graph (extracted by JS, serialized to `ScopeInfo`)
- **OXC**: `ScopeTree` + `SymbolTable` from `oxc_semantic` (Rust-native, converted to `ScopeInfo`)
- **SWC**: Hygiene system (`SyntaxContext`/`Mark`) — requires building a scope tree equivalent

The `ScopeInfo` type from `rust-port-0002` serves as the common abstraction. Each integration extracts its tool's scope model into this format.

### Integration Size Comparison

| Tool | Integration Code | Where Logic Lives |
|------|-----------------|-------------------|
| Babel (this doc) | ~50 lines JS + NAPI bridge | Rust |
| OXC (future) | ~100 lines Rust (AST conversion) | Rust |
| SWC (future) | ~100 lines Rust (AST conversion + scope extraction) | Rust |

---

## Differences from Current TS Plugin

### Behavioral Equivalence

The Rust plugin must produce identical output to the TS plugin for all inputs. The existing test infrastructure (`yarn snap`) can be used to verify this by running both plugins on the same fixtures and comparing output.

### Known Differences

1. **Timing events**: Handled on the JS side using `performance.mark/measure` (not sent to Rust). The JS shim wraps the Rust call with timing markers.

2. **`CompilerError` class**: Rust returns a plain JSON error object. The JS shim constructs a `CompilerError`-compatible exception for Babel's error reporting.

3. **`debugLogIRs` logger callback**: This optional callback receives intermediate compiler pipeline values. Rust would need to serialize these if supported. **Decision**: Defer to a follow-up; not needed for initial parity.

4. **Comments handling**: Babel stores comments separately on `file.ast.comments`, not attached to AST nodes. The JS shim attaches comments to the program AST before serializing. Rust uses them for suppression detection.
