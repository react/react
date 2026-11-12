# Plan: `react_compiler_oxc` — OXC Frontend for React Compiler

## Context

The Rust React Compiler (`compiler/crates/`) currently accepts Babel-format AST (`react_compiler_ast::File`) + scope info (`ScopeInfo`) and compiles via `compile_program()`. The only frontend is a Babel NAPI bridge (`compiler/packages/babel-plugin-react-compiler-rust/`). This plan adds an OXC frontend that enables both **build-time code transformation** and **linting** via the OXC ecosystem, all in pure Rust (no JS/NAPI boundary).

## Crate Structure

```
compiler/crates/react_compiler_oxc/
  Cargo.toml
  src/
    lib.rs              — Public API: transform(), lint(), ReactCompilerRule
    prefilter.rs        — Quick check for React-like function names in OXC AST
    convert_ast.rs      — OXC AST → react_compiler_ast::File
    convert_ast_reverse.rs — react_compiler_ast → OXC AST (for applying results)
    convert_scope.rs    — OXC Semantic → ScopeInfo
    diagnostics.rs      — CompileResult → OxcDiagnostic conversion
```

### Dependencies (Cargo.toml)

```toml
[dependencies]
react_compiler_ast = { path = "../react_compiler_ast" }
react_compiler = { path = "../react_compiler" }
react_compiler_diagnostics = { path = "../react_compiler_diagnostics" }
oxc_parser = "..."
oxc_ast = "..."
oxc_semantic = "..."
oxc_allocator = "..."
oxc_span = "..."
oxc_diagnostics = "..."
oxc_linter = "..."       # for Rule trait
indexmap = "..."
```

## Module Details

### 1. `prefilter.rs` — Quick React Function Check

Port of `babel-plugin-react-compiler-rust/src/prefilter.ts`.

```rust
pub fn has_react_like_functions(program: &oxc_ast::ast::Program) -> bool
```

- Use `oxc_ast::Visit` trait to walk the AST
- Check `FunctionDeclaration` names, `VariableDeclarator` inits that are arrow/function expressions
- Skip class bodies
- Name check: `starts_with(uppercase)` or matches `use[A-Z0-9]`
- Return `true` on first match (early exit)

### 2. `convert_scope.rs` — OXC Semantic → ScopeInfo

```rust
pub fn convert_scope_info(semantic: &oxc_semantic::Semantic) -> ScopeInfo
```

This is the most natural conversion — both use arena-indexed flat tables with copyable u32 IDs.

**Scopes:** Iterate `semantic.scopes()`. For each scope:
- `ScopeId` — direct u32 remapping
- `parent` — from `scope_tree.get_parent_id()`
- `kind` — map `ScopeFlags` → `ScopeKind` (Top→Program, Function→Function, CatchClause→Catch, etc.; use parent AST node to distinguish For vs Block)
- `bindings` — from `scope_tree.get_bindings()`, map name→SymbolId to name→BindingId

**Bindings:** Iterate `semantic.symbols()`. For each symbol:
- `BindingId` — direct u32 remapping from SymbolId
- `name`, `scope` — direct from SymbolTable
- `kind` — inspect declaration AST node type: VariableDeclaration(var/let/const), FunctionDeclaration→Hoisted, param→Param, ImportDeclaration→Module
- `declaration_type` — string name of the declaring AST node type
- `declaration_start` — span.start of the binding's declaring identifier
- `import` — for Module bindings, extract source/kind/imported from the ImportDeclaration

**`node_to_scope`:** Walk AST nodes that create scopes; map `node.span().start → ScopeId`.

**`reference_to_binding`:** Iterate all references from SymbolTable. For each resolved reference: map `reference.span().start → BindingId`. Also add each symbol's declaration identifier span.

**`program_scope`:** `ScopeId(0)`.

Key files:
- Target types: `compiler/crates/react_compiler_ast/src/scope.rs`
- Reference impl: `compiler/packages/babel-plugin-react-compiler-rust/src/scope.ts`

### 3. `convert_ast.rs` — OXC AST → react_compiler_ast::File

```rust
pub fn convert_program(
    program: &oxc_ast::ast::Program,
    source_text: &str,
    comments: &[oxc_ast::Comment],
) -> react_compiler_ast::File
```

**Approach:** Recursive conversion, one function per AST category (statement, expression, pattern, JSX, etc.). Data is copied out of OXC's arena into owned `react_compiler_ast` types.

**ConvertCtx:** Holds a line-offset table (built from source_text at init) for computing `Position { line, column, index }` from byte offsets.

**BaseNode construction:**
- `start = Some(span.start)`, `end = Some(span.end)` — critical for scope lookups
- `loc` — computed via line-offset table binary search

**Key mappings:**
| OXC | react_compiler_ast |
|-----|-------------------|
| `Statement` enum variants | `statements::Statement` variants |
| `Expression` enum variants | `expressions::Expression` variants |
| `Declaration` (separate in OXC) | Folded into `Statement` (Babel style) |
| `BindingPattern` | `patterns::PatternLike` |
| `JSXElement/Fragment/etc` | `jsx::*` types |
| TS type annotations | `Option<Box<serde_json::Value>>` (opaque passthrough) |

**Comments:** Map OXC `Comment { kind, span }` → `react_compiler_ast::common::Comment` (CommentBlock/CommentLine with start/end/value).

Key files:
- Target types: `compiler/crates/react_compiler_ast/src/` (all modules)

### 4. `convert_ast_reverse.rs` — react_compiler_ast → OXC AST

Mirror of `convert_ast.rs`. Converts the compiled Babel-format AST back into OXC AST nodes.

```rust
pub fn convert_program_to_oxc<'a>(
    file: &react_compiler_ast::File,
    allocator: &'a oxc_allocator::Allocator,
) -> oxc_ast::ast::Program<'a>
```

- Allocates new OXC AST nodes into the provided arena
- Maps each `react_compiler_ast` type back to its OXC equivalent
- The `CompileResult::Success { ast, .. }` returns `ast: Option<serde_json::Value>` — first deserialize to `react_compiler_ast::File`, then convert to OXC

This is the most labor-intensive module but avoids the perf cost of re-parsing.

### 5. `diagnostics.rs` — Compiler Results → OXC Diagnostics

```rust
pub fn compile_result_to_diagnostics(
    result: &CompileResult,
    source_text: &str,
) -> Vec<oxc_diagnostics::OxcDiagnostic>
```

Map compiler events/errors to OXC diagnostics:
- `LoggerEvent::CompileError { fn_loc, detail }` → `OxcDiagnostic::warn/error` with label at fn_loc span
- `CompileResult::Error { error, .. }` → `OxcDiagnostic::error`
- Preserve error messages and source locations

### 6. `lib.rs` — Public API

#### Transform API (build pipeline)

```rust
/// Result of compiling a program
pub struct TransformResult<'a> {
    /// The compiled program (None if no changes needed)
    pub program: Option<oxc_ast::ast::Program<'a>>,
    pub diagnostics: Vec<oxc_diagnostics::OxcDiagnostic>,
    pub events: Vec<LoggerEvent>,
}

/// Primary API — accepts pre-parsed AST + semantic
pub fn transform<'a>(
    program: &oxc_ast::ast::Program,
    semantic: &oxc_semantic::Semantic,
    source_text: &str,
    comments: &[oxc_ast::Comment],
    options: PluginOptions,
    output_allocator: &'a oxc_allocator::Allocator,
) -> TransformResult<'a>

/// Convenience wrapper — parses from source text
pub fn transform_source<'a>(
    source_text: &str,
    source_type: oxc_span::SourceType,
    options: PluginOptions,
    output_allocator: &'a oxc_allocator::Allocator,
) -> TransformResult<'a>
```

Flow:
1. Prefilter (`has_react_like_functions`). Skip if `compilationMode == "all"`.
2. Convert AST (`convert_program`)
3. Convert scope (`convert_scope_info`)
4. Call `compile_program(file, scope_info, options)`
5. On success with modified AST: deserialize JSON → `File`, reverse-convert to OXC AST
6. Convert diagnostics

#### Lint API

```rust
pub struct LintResult {
    pub diagnostics: Vec<oxc_diagnostics::OxcDiagnostic>,
}

/// Lint — accepts pre-parsed AST + semantic
pub fn lint(
    program: &oxc_ast::ast::Program,
    semantic: &oxc_semantic::Semantic,
    source_text: &str,
    comments: &[oxc_ast::Comment],
    options: PluginOptions,
) -> LintResult

/// Convenience wrapper
pub fn lint_source(
    source_text: &str,
    source_type: oxc_span::SourceType,
    options: PluginOptions,
) -> LintResult
```

Same as transform but with `no_emit = true` / lint output mode. Only collects diagnostics, no AST output.

#### oxc_linter::Rule Implementation

```rust
pub struct ReactCompilerRule {
    options: PluginOptions,
}

impl oxc_linter::Rule for ReactCompilerRule {
    fn run_once(&self, ctx: &LintContext) {
        // ctx already has parsed AST + semantic
        let result = lint(
            ctx.program(),
            ctx.semantic(),
            ctx.source_text(),
            ctx.comments(),
            self.options.clone(),
        );
        for diagnostic in result.diagnostics {
            ctx.diagnostic(diagnostic);
        }
    }
}
```

This avoids double-parsing since oxc_linter provides pre-parsed AST and semantic analysis.

## Implementation Phases

### Phase 1: Foundation (convert_scope + convert_ast + prefilter)
- `convert_scope.rs` with unit tests comparing against Babel scope extraction
- `convert_ast.rs` with unit tests comparing against Babel parser JSON output
- `prefilter.rs` with simple true/false tests
- These are independently testable without the full pipeline

### Phase 2: Lint path (diagnostics + lint API + Rule)
- `diagnostics.rs`
- `lint()` function in `lib.rs`
- `ReactCompilerRule` impl
- Test against existing compiler fixtures — verify diagnostics match

### Phase 3: Transform path (reverse converter + transform API)
- `convert_ast_reverse.rs`
- `transform()` function in `lib.rs`
- Integration tests: compile fixtures through OXC pipeline, compare output with Babel pipeline

### Phase 4: Differential testing
- Cross-validate AST conversion: parse same source with both Babel and OXC, convert both to `react_compiler_ast::File`, diff
- Cross-validate scope conversion: compare `ScopeInfo` from both paths
- Run full fixture suite through both pipelines, compare compiled output

## Verification

1. **Unit tests:** Each module has tests for its conversion logic
2. **Fixture tests:** Use existing fixtures at `compiler/packages/babel-plugin-react-compiler/src/__tests__/fixtures/compiler/`
3. **Differential tests:** Compare OXC path output against Babel path output for same inputs
4. **`cargo test -p react_compiler_oxc`** — run all crate tests
5. **Scope correctness:** Most critical — incorrect scope info causes wrong compilation. Snapshot `ScopeInfo` JSON and compare against Babel extraction golden files
