# Rust Port Gap Analysis

Comprehensive comparison of the TypeScript and Rust compiler implementations.
Generated 2026-03-30 from systematic review of all major subsystems.

Current test status: Pass 1717/1717, Code 1716/1717, Snap 1717/1718.

---

## Critical Gaps (incorrect compilation possible)

### 3. Hardcoded `useMemoCache` identifier name
- **TS**: `ReactiveScopes/CodegenReactiveFunction.ts:166-178`
  ```typescript
  const useMemoCacheIdentifier = fn.env.programContext.addMemoCacheImport().name;
  ```
- **Rust**: `react_compiler_reactive_scopes/src/codegen_reactive_function.rs:179`
  ```rust
  callee: Box::new(Expression::Identifier(make_identifier("useMemoCache"))),
  ```
- The TS dynamically resolves the `useMemoCache` import to `_c` (from `react/compiler-runtime` import specifier `c`). The Rust hardcodes `"useMemoCache"`. The BabelPlugin.ts wrapper handles the rename to `_c` during AST application, so this works in practice, but it means the codegen output has an incorrect intermediate identifier.


---

## Moderate Gaps (feature gaps or edge cases)

### 6. Missing `optimizeForSSR` pass
- **TS**: `Entrypoint/Pipeline.ts:223-226`
- **Rust**: MISSING entirely
- Inlines useState/useReducer, removes effects, strips event handlers from JSX, removes refs. Without it, SSR-mode compilation produces unoptimized output.

### 7. Missing `enableForest` codegen path
- **TS**: `ReactiveScopes/CodegenReactiveFunction.ts:1527-1536`
- **Rust**: MISSING
- Skips hook guard wrapping and emits `typeArguments` on call expressions. Missing in Rust means forest mode has incorrect hook wrapping and dropped type arguments.

### 8. Function name inference from AssignmentExpression and Property
- **TS**: `Entrypoint/Program.ts:1226-1268` — three cases: `parent.isAssignmentExpression()`, `parent.isProperty()`, `parent.isAssignmentPattern()`
- **Rust**: `program.rs:1483-1488` — only handles `VariableDeclarator`
- Functions in `Foo = () => {}`, `{useFoo: () => {}}`, or `{useFoo = () => {}} = {}` positions are nameless in Rust, preventing component/hook detection via name heuristics.

### 9. Missing validations in outlined function pipeline
- **TS**: Outlined functions go through full `compileFn` → all validations
- **Rust**: `run_pipeline_passes` skips: `validateContextVariableLValues`, `validateUseMemo`, `validateNoDerivedComputationsInEffects/_exp`, `validateNoSetStateInEffects`, `validateNoJSXInTryStatement`, `validateNoCapitalizedCalls`, `validateStaticComponents`
- Also missing: `has_errors()` check at end, `memo_cache_import` registration

### 10. Reanimated flag injection missing
- **TS**: `Babel/BabelPlugin.ts:48-53` — `injectReanimatedFlag(opts)` sets `enableCustomTypeDefinitionForReanimated = true`
- **Rust**: Detects reanimated but doesn't inject the flag into environment config
- Custom type definitions for reanimated shared values won't activate.

### 11. Dev-mode `enableResetCacheOnSourceFileChanges` injection missing
- **TS**: `Babel/BabelPlugin.ts:54-65` — auto-enables in dev mode
- **Rust**: MISSING
- Fast refresh cache-reset code won't generate in dev mode unless explicitly configured.

### 12. Outlined functions not re-queued for compilation
- **TS**: `Entrypoint/Program.ts:476-501` — outlined functions with a React function type are pushed back into the compilation queue
- **Rust**: `program.rs:2244-2262` — only does AST insertion
- Outlined functions don't receive full compilation treatment (memoization).

### 13. Missing `addNewReference` in RenameVariables
- **TS**: `ReactiveScopes/RenameVariables.ts:163` — `this.#programContext.addNewReference(name)`
- **Rust**: MISSING
- Newly created variable names aren't registered with the program context, risking import binding conflicts.

### 14. `known_incompatible` not checked for legacy signatures without aliasing config
- **TS**: `Inference/InferMutationAliasingEffects.ts:2351-2370`
- **Rust**: `infer_mutation_aliasing_effects.rs:2099-2100` — TODO comment, only checked in the `Apply` path with aliasing configs
- If any legacy signatures (without aliasing configs) have `known_incompatible` set, Rust silently continues.

---

## Minor Gaps (cosmetic, defensive, or unlikely to trigger)

### 15. Missing `assertValidMutableRanges` pass
- **TS**: `Pipeline.ts:246-249` — gated behind `config.assertValidMutableRanges` (defaults false)
- **Rust**: Config flag exists but pass never called
- Debugging-only validation, no production impact.

### 16. Missing `ValidateNoDerivedComputationsInEffects_exp` experimental variant
- **TS**: 842-line experimental validation pass
- **Rust**: MISSING — only the non-experimental version is ported
- Only affects users who explicitly enable the experimental flag in lint mode.

### 17. Missing `CompileUnexpectedThrow` event
- **TS**: `Program.ts:755-769` — logs when a pass incorrectly throws
- **Rust**: Event type defined but never emitted
- Development-time detection of misbehaving passes.

### 18. Missing error for `sources`-specified-without-filename
- **TS**: Creates a Config error via `handleError`
- **Rust**: Silently sets `shouldCompile = false`

### 19. Missing `codegen_block` temporary invariant check
- **TS**: `CodegenReactiveFunction.ts:474-492` — verifies no temporary was overwritten
- **Rust**: Restores snapshot without checking

### 20. Extra `NullLiteralTypeAnnotation` rejection
- **Rust** rejects Flow `null` type annotation on first param (over-conservative vs TS)

### 21. `UnsignedShiftRight` (`>>>`) not classified as primitive binary op
- **Rust**: `infer_types.rs:140-159` — missing from `is_primitive_binary_op`
- Operands won't be constrained to Primitive type, but result is still Primitive.

### 22. Post-dominator frontier not cached in InferReactivePlaces
- **Rust**: Recomputes frontier on every call instead of caching per block ID
- Performance issue only, not correctness.

### 23. `Math.random` missing `restParam`
- **TS**: `restParam: Effect.Read`
- **Rust**: `rest_param: None` (uses default `..Default::default()`)
- Affects extra-argument fallback effect only.

### 24. `WeakSet.has` / `WeakMap.has` wrong signature shape
- **TS**: `positionalParams: [Effect.Read], restParam: null`
- **Rust**: Uses `pure_primitive_fn` → `positional_params: [], rest_param: Some(Effect::Read)`
- Difference in extra-argument fallback behavior only.

### 25. Missing `throwUnknownException__testonly` in outlined function pipeline
- Test-only feature.
