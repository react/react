# Rust port: e2e parity TODO

Status snapshot (after the current stack lands):

| Variant | Score        | Failures |
| ------- | ------------ | -------- |
| Babel   | 1792 / 1802  | 10       |
| SWC     | 1786 / 1802  | 16       |
| OXC     | 1704 / 1795  | 91       |

The corpus grew by the three `ts-*` module-interop fixtures (1799 →
1802 on this branch). The Babel/SWC rows are measured on this branch
and their failure sets are byte-identical to the pre-stack baseline;
the OXC row predates the fixtures and has not been re-measured.

`cargo test --workspace`: 84 passed, 0 failed.

## SWC

(Historical, pre-ts-interop-stack triage on the old staging base; current
snapshot at top.)

The 15 remaining SWC e2e failures fall into three groups. Each line names the
fixture and the failure mode; the group it sits in dictates the appropriate
fix.

### Group A: Fixture maintenance, not Rust bugs

SWC compiles code that TS rejects, or vice versa, in ways where Rust's
behavior is arguably correct. The fix is to rename the fixture (drop the
`error.` prefix) and update the `.expect.md` snapshot so the suite stops
asserting the TS-specific output.

- `error.bug-invariant-local-or-context-references.js` — TS fires
	`CompilerError::invariant` ("expected all references ... consistently
	local or context"). Rust handles the same code without tripping the
	invariant.
- `error.todo-jsx-intrinsic-tag-matches-local-binding.js` — SWC pipeline
	emits a Todo bailout (`[hoisting] EnterSSA: Expected identifier to be
	defined before being used`) that the Babel path does not.
- `error.todo-repro-named-function-with-shadowed-local-same-name.js` —
	Babel errors; SWC compiles.
- `new-mutability/error.todo-repro-named-function-with-shadowed-local-same-name.js`
	— same as above with the new mutation-aliasing model enabled.
- `error.todo-rust-as-expression-assignment-target.tsx` — Babel errors;
	SWC compiles.
- `fbt/error.todo-locally-require-fbt.js` — Babel emits the
	`Invariant: <fbt> tags should be module-level imports` shape; SWC emits
	`Todo: Local variables named 'fbt' may conflict with the fbt plugin`.
	Different categories, both reasonable.

### Group B: External dependency

- `use-no-forget-multiple-with-eslint-suppression.js` — spurious
	`import { c as _c }` in the TS reference output. Fixed on `main` by
	[react#36500](https://github.com/facebook/react/pull/36500) (merged).
	Will pass automatically once `pr-36173` rebases onto `main`; until then
	the TS dist built from `pr-36173` still emits the unused import.

### Group C: Real SWC frontend bugs

Each line names the failure mode and a sketch of where to look.

- `fbt/fbt-param-with-quotes.js` — SWC codegen emits double quotes
	(`"fbt"`) and reformats multi-line JSX into a single line; Babel uses
	single quotes and preserves the source layout. Semantically equivalent
	output; the fix is either an SWC codegen flag for quote style or a
	post-emit pass. Low impact, high effort.

- `lone-surrogate-string-values.js` — TS preserves lone surrogates
	(`\uD83E`); SWC emits `\uFFFD` because `Wtf8Atom::to_string_lossy()` in
	`react_compiler_swc/src/convert_ast.rs::wtf8_to_string` replaces invalid
	UTF-8 sequences. Real WTF-8 handling work that touches every call site
	using that helper. Probably needs to detect lone surrogates and emit
	`\uXXXX` escapes before they hit `String`.

- `many-scopes-no-stack-overflow.js` — TS memoizes the function
	(`const $ = _c(401);` with 401 memo slots); SWC pipeline bails out and
	returns the uncompiled source. The fixture exists to test that the
	compiler handles many sequential reactive scopes without stack overflow,
	so the SWC variant should compile. Root cause unclear — needs
	investigation in the SWC pipeline or the compiler core to see where the
	bail happens.

- `pattern4_bare_type.js` — Two unrelated bugs in one fixture:
	1. Operator-precedence stripping. `Math.round((x - y) * 1000)` becomes
		 `Math.round(x - y * 1000)`. SWC codegen drops the parentheses around
		 the subtraction. Probably in `convert_ast_reverse.rs`'s
		 BinaryExpression handling.
	2. Method return type annotation. `formatMetrics(): Metrics` becomes
		 `formatMetrics()`. The TS-type-on-binding-ident fix in commit
		 cc1ba1e1 only covered binding identifiers; class method signatures
		 are a separate code path. Same shape of fix; different
		 `convert_binding_ident`-equivalent call site.

- `reduce-reactive-deps/hoist-deps-diff-ssa-instance1.tsx` —
	`(x as HasA).a.value + 2` becomes `(x as HasA.a.value) + 2`. The member
	expression's property chain gets absorbed into the type annotation when
	`convert_ast_reverse` emits the cast. Likely a parenthesization /
	precedence bug in the reverse converter or the SWC printer's handling
	of `TSAsExpression` as the object of a `MemberExpression`.

- `todo-round2_unicode_string.js` (prefixed `todo-`) — Hex escape format
	(`\xC5`) vs unicode escape (`\u00C5`) for bytes 0x80-0xFF. Both valid JS
	literals; codegen format choice in SWC's string printer.

- `todo-round3_promote_used_temps.js` (prefixed `todo-`) — Class body
	codegen. TS emits the class with fields and constructor; SWC emits an
	empty class body and pulls fields/methods out into separate assignments.
	Likely an interaction between SWC codegen and the compiler's
	`promote_used_temps` pass.

- `ts-non-null-expression-default-value.tsx` — Generic type parameter
	support. `const x: ReadonlyMap<string, string> = ...` becomes
	`const x = ...` (annotation dropped entirely). Our
	`convert_ts_type_to_json` helper in cc1ba1e1 explicitly guards against
	`TsTypeRef` with `type_params` to avoid silently emitting
	`ReadonlyMap` without the params. The proper fix needs serialization of
	`TSTypeParameterInstantiation` in `convert_ast.rs` AND deserialization
	in `convert_ast_reverse.rs::convert_ts_type_from_json`.

## Cross-frontend: TypeScript module interop statements

Three `ts-*` fixtures pin how TS module-interop statements
(`import x = require(...)`, `export = x`, `export as namespace X`) must
behave: the statement is preserved in output and the file's functions
still compile.

- **Babel/NAPI** and **SWC** now preserve these end to end. Both flow
	the statements through `Statement::Unknown` (the raw Babel-shaped
	carrier in `react_compiler_ast`); the SWC frontend rebuilds the swc
	module declarations in `convert_ast_reverse.rs` and works around an
	upstream swc_ecma_codegen bug that prints `TsNamespaceExportDecl`
	as `export = X` (`react_compiler_swc/src/ts_namespace_export_fixup.rs`,
	which also carries the guard test that flags when the upstream fix
	lands). Fixtures renamed from `todo-ts-*` to `ts-*`; the
	`SproutTodoFilter` entry for the namespace fixture remains (sprout's
	evaluator cannot evaluate `export as namespace`).
- **OXC** remains deferred: `todo!()` panics in
	`react_compiler_oxc/src/convert_ast.rs` (arms
	`TSImportEqualsDeclaration` / `TSExportAssignment` /
	`TSNamespaceExportDeclaration`; the sibling `TSGlobalDeclaration`
	arm is also unmodeled but unreachable from Babel-parsed fixtures,
	which represent `declare global` as `TSModuleDeclaration`).

- `ts-import-equals-declaration.ts`
- `ts-export-assignment.ts`
- `ts-namespace-export-declaration.ts`

## Babel

(Historical, pre-ts-interop-stack numbers; current snapshot at top.)

**TODO: scope this out.** Babel is at 1788 / 1795 (7 failures). These have
been the baseline throughout the SWC parity stack and were not touched, so the
failure list is whatever was on `pr-36173` before this work landed.

Next step is to enumerate the failures by fixture and bucket them the same
way as SWC (fixture maintenance / external dependency / real bugs). Run:

```bash
bash compiler/scripts/test-e2e.sh --no-color --variant babel
```

…and triage the resulting failures into A/B/C groups under this section.

## OXC

(Historical, pre-ts-interop-stack numbers; current snapshot at top.)

**TODO: scope this out.** OXC is at 1704 / 1795 (91 failures). The CLI
`filename` fix in commit c30f0d6f bumped this by +2 from the 1702 baseline,
but everything else is unaddressed.

Next step is to enumerate failures and identify OXC-specific clusters
(likely AST conversion gaps in `react_compiler_oxc` analogous to the SWC
work in this stack). Run:

```bash
bash compiler/scripts/test-e2e.sh --no-color --variant oxc
```

…and bucket the resulting failures into A/B/C groups under this section.
Expect significant overlap with the SWC Group C bugs (cast wrappers,
type annotations, UTF-16/WTF-8 handling) since both frontends share the
post-conversion pipeline.

## How this stack got here

(Historical, pre-ts-interop-stack numbers; current snapshot at top.)

- `compiler/scripts/test-e2e.sh --variant swc` baseline was 1742 / 1795
	(53 failures) before this stack.
- 9 commits in the current stack reduce that to 1780 / 1795 (15 failures,
	-38 fixtures, 72% reduction).
- Babel variant: 1788 / 1795 throughout (no regressions).
- OXC variant: 1702 → 1704 (the CLI filename commit also benefited OXC).
- `cargo test --workspace`: 56 passed, 0 failed throughout.
