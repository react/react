# React Compiler Passes Documentation

This directory contains detailed documentation for each pass in the React Compiler pipeline. The compiler transforms React components and hooks to add automatic memoization.

## High-Level Architecture

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     COMPILATION PIPELINE                      │
                    └─────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: HIR CONSTRUCTION                                                          │
│  ┌─────────┐                                                                        │
│  │  Babel  │──▶ lower ──▶ enterSSA ──▶ eliminateRedundantPhi                        │
│  │   AST   │              │                                                         │
│  └─────────┘              ▼                                                         │
│                     ┌──────────┐                                                    │
│                     │   HIR    │  (Control Flow Graph in SSA Form)                  │
│                     └──────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: OPTIMIZATION                                                              │
│                                                                                     │
│  constantPropagation ──▶ deadCodeElimination                                         │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: TYPE & EFFECT INFERENCE                                                   │
│                                                                                     │
│  inferTypes ──▶ analyseFunctions ──▶ inferMutationAliasingEffects                   │
│                                              │                                      │
│                                              ▼                                      │
│                         inferMutationAliasingRanges ──▶ inferReactivePlaces         │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: REACTIVE SCOPE CONSTRUCTION                                               │
│                                                                                     │
│  inferReactiveScopeVariables ──▶ alignMethodCallScopes ──▶ alignObjectMethodScopes  │
│              │                                                                      │
│              ▼                                                                      │
│  alignReactiveScopesToBlockScopesHIR ──▶ mergeOverlappingReactiveScopesHIR          │
│              │                                                                      │
│              ▼                                                                      │
│  buildReactiveScopeTerminalsHIR ──▶ flattenReactiveLoopsHIR                         │
│              │                                                                      │
│              ▼                                                                      │
│  flattenScopesWithHooksOrUseHIR ──▶ propagateScopeDependenciesHIR                   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: HIR → REACTIVE FUNCTION                                                   │
│                                                                                     │
│                           buildReactiveFunction                                     │
│                                    │                                                │
│                                    ▼                                                │
│                         ┌───────────────────┐                                       │
│                         │ ReactiveFunction  │  (Tree Structure)                     │
│                         └───────────────────┘                                       │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 6: REACTIVE FUNCTION OPTIMIZATION                                            │
│                                                                                     │
│  pruneUnusedLabels ──▶ pruneNonEscapingScopes ──▶ pruneNonReactiveDependencies      │
│              │                                                                      │
│              ▼                                                                      │
│  pruneUnusedScopes ──▶ mergeReactiveScopesThatInvalidateTogether                    │
│              │                                                                      │
│              ▼                                                                      │
│  pruneAlwaysInvalidatingScopes ──▶ propagateEarlyReturns ──▶ promoteUsedTemporaries │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 7: CODE GENERATION                                                           │
│                                                                                     │
│  renameVariables ──▶ codegenReactiveFunction                                        │
│                              │                                                      │
│                              ▼                                                      │
│                      ┌─────────────┐                                                │
│                      │  Babel AST  │  (With Memoization)                            │
│                      └─────────────┘                                                │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Pass Categories

### HIR Construction & SSA (1-3)

| # | Pass | File | Description |
|---|------|------|-------------|
| 1 | [lower](01-lower.md) | `HIR/BuildHIR.ts` | Convert Babel AST to HIR control-flow graph |
| 2 | [enterSSA](02-enterSSA.md) | `SSA/EnterSSA.ts` | Convert to Static Single Assignment form |
| 3 | [eliminateRedundantPhi](03-eliminateRedundantPhi.md) | `SSA/EliminateRedundantPhi.ts` | Remove unnecessary phi nodes |

### Optimization (4-5)

| # | Pass | File | Description |
|---|------|------|-------------|
| 4 | [constantPropagation](04-constantPropagation.md) | `Optimization/ConstantPropagation.ts` | Sparse conditional constant propagation |
| 5 | [deadCodeElimination](05-deadCodeElimination.md) | `Optimization/DeadCodeElimination.ts` | Remove unreferenced instructions |

### Type Inference (6)

| # | Pass | File | Description |
|---|------|------|-------------|
| 6 | [inferTypes](06-inferTypes.md) | `TypeInference/InferTypes.ts` | Constraint-based type unification |

### Mutation/Aliasing Inference (7-10)

| # | Pass | File | Description |
|---|------|------|-------------|
| 7 | [analyseFunctions](07-analyseFunctions.md) | `Inference/AnalyseFunctions.ts` | Analyze nested function effects |
| 8 | [inferMutationAliasingEffects](08-inferMutationAliasingEffects.md) | `Inference/InferMutationAliasingEffects.ts` | Infer mutation/aliasing via abstract interpretation |
| 9 | [inferMutationAliasingRanges](09-inferMutationAliasingRanges.md) | `Inference/InferMutationAliasingRanges.ts` | Compute mutable ranges from effects |
| 10 | [inferReactivePlaces](10-inferReactivePlaces.md) | `Inference/InferReactivePlaces.ts` | Mark reactive places (props, hooks, derived) |

### Reactive Scope Variables (11-12)

| # | Pass | File | Description |
|---|------|------|-------------|
| 11 | [inferReactiveScopeVariables](11-inferReactiveScopeVariables.md) | `ReactiveScopes/InferReactiveScopeVariables.ts` | Group co-mutating variables into scopes |
| 12 | [rewriteInstructionKindsBasedOnReassignment](12-rewriteInstructionKindsBasedOnReassignment.md) | `SSA/RewriteInstructionKindsBasedOnReassignment.ts` | Convert SSA loads to context loads for reassigned vars |

### Scope Alignment (13-15)

| # | Pass | File | Description |
|---|------|------|-------------|
| 13 | [alignMethodCallScopes](13-alignMethodCallScopes.md) | `ReactiveScopes/AlignMethodCallScopes.ts` | Align method call scopes with receivers |
| 14 | [alignObjectMethodScopes](14-alignObjectMethodScopes.md) | `ReactiveScopes/AlignObjectMethodScopes.ts` | Align object method scopes |
| 15 | [alignReactiveScopesToBlockScopesHIR](15-alignReactiveScopesToBlockScopesHIR.md) | `ReactiveScopes/AlignReactiveScopesToBlockScopesHIR.ts` | Align to control-flow block boundaries |

### Scope Construction (16-18)

| # | Pass | File | Description |
|---|------|------|-------------|
| 16 | [mergeOverlappingReactiveScopesHIR](16-mergeOverlappingReactiveScopesHIR.md) | `HIR/MergeOverlappingReactiveScopesHIR.ts` | Merge overlapping scopes |
| 17 | [buildReactiveScopeTerminalsHIR](17-buildReactiveScopeTerminalsHIR.md) | `HIR/BuildReactiveScopeTerminalsHIR.ts` | Insert scope terminals into CFG |
| 18 | [flattenReactiveLoopsHIR](18-flattenReactiveLoopsHIR.md) | `ReactiveScopes/FlattenReactiveLoopsHIR.ts` | Prune scopes inside loops |

### Scope Flattening & Dependencies (19-20)

| # | Pass | File | Description |
|---|------|------|-------------|
| 19 | [flattenScopesWithHooksOrUseHIR](19-flattenScopesWithHooksOrUseHIR.md) | `ReactiveScopes/FlattenScopesWithHooksOrUseHIR.ts` | Prune scopes containing hooks |
| 20 | [propagateScopeDependenciesHIR](20-propagateScopeDependenciesHIR.md) | `HIR/PropagateScopeDependenciesHIR.ts` | Derive minimal scope dependencies |

### HIR → Reactive Conversion (21)

| # | Pass | File | Description |
|---|------|------|-------------|
| 21 | [buildReactiveFunction](21-buildReactiveFunction.md) | `ReactiveScopes/BuildReactiveFunction.ts` | Convert CFG to tree structure |

### Reactive Function Pruning (22-25)

| # | Pass | File | Description |
|---|------|------|-------------|
| 22 | [pruneUnusedLabels](22-pruneUnusedLabels.md) | `ReactiveScopes/PruneUnusedLabels.ts` | Remove unused labels |
| 23 | [pruneNonEscapingScopes](23-pruneNonEscapingScopes.md) | `ReactiveScopes/PruneNonEscapingScopes.ts` | Remove non-escaping scopes |
| 24 | [pruneNonReactiveDependencies](24-pruneNonReactiveDependencies.md) | `ReactiveScopes/PruneNonReactiveDependencies.ts` | Remove non-reactive dependencies |
| 25 | [pruneUnusedScopes](25-pruneUnusedScopes.md) | `ReactiveScopes/PruneUnusedScopes.ts` | Remove empty scopes |

### Scope Optimization (26-28)

| # | Pass | File | Description |
|---|------|------|-------------|
| 26 | [mergeReactiveScopesThatInvalidateTogether](26-mergeReactiveScopesThatInvalidateTogether.md) | `ReactiveScopes/MergeReactiveScopesThatInvalidateTogether.ts` | Merge co-invalidating scopes |
| 27 | [pruneAlwaysInvalidatingScopes](27-pruneAlwaysInvalidatingScopes.md) | `ReactiveScopes/PruneAlwaysInvalidatingScopes.ts` | Prune always-invalidating scopes |
| 28 | [propagateEarlyReturns](28-propagateEarlyReturns.md) | `ReactiveScopes/PropagateEarlyReturns.ts` | Handle early returns in scopes |

### Codegen Preparation (29-31)

| # | Pass | File | Description |
|---|------|------|-------------|
| 29 | [promoteUsedTemporaries](29-promoteUsedTemporaries.md) | `ReactiveScopes/PromoteUsedTemporaries.ts` | Promote temps to named vars |
| 30 | [renameVariables](30-renameVariables.md) | `ReactiveScopes/RenameVariables.ts` | Ensure unique variable names |
| 31 | [codegenReactiveFunction](31-codegenReactiveFunction.md) | `ReactiveScopes/CodegenReactiveFunction.ts` | Generate final Babel AST |

### Transformations (32-38)

| # | Pass | File | Description |
|---|------|------|-------------|
| 34 | [optimizePropsMethodCalls](34-optimizePropsMethodCalls.md) | `Optimization/OptimizePropsMethodCalls.ts` | Normalize props method calls |
| 35 | [optimizeForSSR](35-optimizeForSSR.md) | `Optimization/OptimizeForSSR.ts` | SSR-specific optimizations |
| 36 | [outlineJSX](36-outlineJSX.md) | `Optimization/OutlineJsx.ts` | Outline JSX to components |
| 37 | [outlineFunctions](37-outlineFunctions.md) | `Optimization/OutlineFunctions.ts` | Outline pure functions |
| 38 | [memoizeFbtAndMacroOperandsInSameScope](38-memoizeFbtAndMacroOperandsInSameScope.md) | `ReactiveScopes/MemoizeFbtAndMacroOperandsInSameScope.ts` | Keep FBT operands together |

### Validation (39-55)

| # | Pass | File | Description |
|---|------|------|-------------|
| 39 | [validateContextVariableLValues](39-validateContextVariableLValues.md) | `Validation/ValidateContextVariableLValues.ts` | Variable reference consistency |
| 40 | [validateUseMemo](40-validateUseMemo.md) | `Validation/ValidateUseMemo.ts` | useMemo callback requirements |
| 41 | [validateHooksUsage](41-validateHooksUsage.md) | `Validation/ValidateHooksUsage.ts` | Rules of Hooks |
| 42 | [validateNoCapitalizedCalls](42-validateNoCapitalizedCalls.md) | `Validation/ValidateNoCapitalizedCalls.ts` | Component vs function calls |
| 43 | [validateLocalsNotReassignedAfterRender](43-validateLocalsNotReassignedAfterRender.md) | `Validation/ValidateLocalsNotReassignedAfterRender.ts` | Variable mutation safety |
| 44 | [validateNoSetStateInRender](44-validateNoSetStateInRender.md) | `Validation/ValidateNoSetStateInRender.ts` | No setState during render |
| 45 | [validateNoDerivedComputationsInEffects](45-validateNoDerivedComputationsInEffects.md) | `Validation/ValidateNoDerivedComputationsInEffects.ts` | Effect optimization hints |
| 46 | [validateNoSetStateInEffects](46-validateNoSetStateInEffects.md) | `Validation/ValidateNoSetStateInEffects.ts` | Effect performance |
| 47 | [validateNoJSXInTryStatement](47-validateNoJSXInTryStatement.md) | `Validation/ValidateNoJSXInTryStatement.ts` | Error boundary usage |
| 48 | [validateNoImpureValuesInRender](48-validateNoImpureValuesInRender.md) | `Validation/ValidateNoImpureValuesInRender.ts` | Impure value isolation |
| 49 | [validateNoRefAccessInRender](49-validateNoRefAccessInRender.md) | `Validation/ValidateNoRefAccessInRender.ts` | Ref access constraints |
| 50 | [validateNoFreezingKnownMutableFunctions](50-validateNoFreezingKnownMutableFunctions.md) | `Validation/ValidateNoFreezingKnownMutableFunctions.ts` | Mutable function isolation |
| 51 | [validateExhaustiveDependencies](51-validateExhaustiveDependencies.md) | `Validation/ValidateExhaustiveDependencies.ts` | Dependency array completeness |
| 53 | [validatePreservedManualMemoization](53-validatePreservedManualMemoization.md) | `Validation/ValidatePreservedManualMemoization.ts` | Manual memo preservation |
| 54 | [validateStaticComponents](54-validateStaticComponents.md) | `Validation/ValidateStaticComponents.ts` | Component identity stability |
| 55 | [validateSourceLocations](55-validateSourceLocations.md) | `Validation/ValidateSourceLocations.ts` | Source location preservation |

## Key Data Structures

### HIR (High-level Intermediate Representation)

The compiler converts source code to HIR for analysis. Key types:

- **HIRFunction**: A function being compiled
  - `body.blocks`: Map of BasicBlocks (control flow graph)
  - `context`: Captured variables from outer scope
  - `params`: Function parameters
  - `returns`: The function's return place

- **BasicBlock**: A sequence of instructions with a terminal
  - `instructions`: Array of Instructions
  - `terminal`: Control flow (return, branch, etc.)
  - `phis`: Phi nodes for SSA

- **Instruction**: A single operation
  - `lvalue`: The place being assigned to
  - `value`: The instruction kind (CallExpression, FunctionExpression, etc.)
  - `effects`: Array of AliasingEffects

- **Place**: A reference to a value
  - `identifier.id`: Unique IdentifierId
  - `effect`: How the place is used (read, mutate, etc.)

### ReactiveFunction

After HIR is analyzed, it's converted to ReactiveFunction:

- Tree structure instead of CFG
- Contains ReactiveScopes that define memoization boundaries
- Each scope has dependencies and declarations

### AliasingEffects

Effects describe data flow and operations:

- **Capture/Alias**: Value relationships
- **Mutate/MutateTransitive**: Mutation tracking
- **Freeze**: Immutability marking
- **Render**: JSX usage context
- **Create/CreateFunction**: Value creation

## Feature Flags

Many passes are controlled by feature flags in `Environment.ts`:

| Flag | Enables Pass |
|------|--------------|
| `enableJsxOutlining` | outlineJSX |
| `enableFunctionOutlining` | outlineFunctions |
| `validateNoSetStateInRender` | validateNoSetStateInRender |
| `enableUseMemoCacheInterop` | Preserves manual memoization |

## Running Tests

```bash
# Run all tests
yarn snap

# Run specific fixture
yarn snap -p <fixture-name>

# Run with debug output (shows all passes)
yarn snap -p <fixture-name> -d

# Compile any file (not just fixtures) and see output
yarn snap compile <path>

# Compile any file with debug output (alternative to yarn snap -d -p when you don't have a fixture)
yarn snap compile --debug <path>

# Minimize a failing test case to its minimal reproduction
yarn snap minimize <path>

# Update expected outputs
yarn snap -u
```

## Fault Tolerance

The pipeline is fault-tolerant: all passes run to completion, accumulating errors on `Environment` rather than aborting on the first error.

- **Validation passes** are wrapped in `env.tryRecord()` in Pipeline.ts, which catches non-invariant `CompilerError`s and records them. If a validation pass throws, compilation continues.
- **Infrastructure/transformation passes** (enterSSA, eliminateRedundantPhi, inferMutationAliasingEffects, codegen, etc.) are NOT wrapped in `tryRecord()` because subsequent passes depend on their output being structurally valid. If they fail, compilation aborts.
- **`lower()` (BuildHIR)** always produces an `HIRFunction`, recording errors on `env` instead of returning `Err`. Unsupported constructs (e.g., `var`) are lowered best-effort.
- At the end of the pipeline, `env.hasErrors()` determines whether to return `Ok(codegen)` or `Err(aggregatedErrors)`.

## Further Reading

- [MUTABILITY_ALIASING_MODEL.md](../../src/Inference/MUTABILITY_ALIASING_MODEL.md): Detailed aliasing model docs
- [Pipeline.ts](../../src/Entrypoint/Pipeline.ts): Pass ordering and orchestration
- [HIR.ts](../../src/HIR/HIR.ts): Core data structure definitions
