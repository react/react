---
name: plan-update
description: Use when you need to update a plan document with deep research across all compiler passes. Launches parallel subagents to analyze how a topic affects every compiler phase, then consolidates findings into the plan doc.
---

# Plan Update

Deep-research a topic across all compiler passes and update a plan document.

Arguments:
- $ARGUMENTS: `<plan-doc-path> <topic/question>`
  - Example: `compiler/docs/rust-port/rust-port-0001-babel-ast.md scope resolution strategy`
  - Example: `compiler/docs/rust-port/rust-port-architecture.md error handling patterns`

## Instructions

### Step 1: Read context

Read these files to understand the current state:
- The plan doc specified in $ARGUMENTS
- `compiler/docs/rust-port/rust-port-architecture.md` (architecture guide and port conventions)
- `compiler/packages/babel-plugin-react-compiler/docs/passes/README.md` (pass overview)

### Step 2: Launch parallel analysis agents

Launch **8 parallel Agent tool calls** using the `analyze-pass-impact` agent. Each agent analyzes one phase group. Pass each agent the topic from $ARGUMENTS and the list of pass doc files for its phase.

**Phase groups and their pass docs:**

1. **Lowering & SSA** (passes 01-03):
   `01-lower.md`, `02-enterSSA.md`, `03-eliminateRedundantPhi.md`

2. **Optimization & Types** (passes 04-06):
   `04-constantPropagation.md`, `05-deadCodeElimination.md`, `06-inferTypes.md`

3. **Function & Effect Analysis** (passes 07-09):
   `07-analyseFunctions.md`, `08-inferMutationAliasingEffects.md`, `09-inferMutationAliasingRanges.md`

4. **Reactivity & Scope Variables** (passes 10-14):
   `10-inferReactivePlaces.md`, `11-inferReactiveScopeVariables.md`, `12-rewriteInstructionKindsBasedOnReassignment.md`, `13-alignMethodCallScopes.md`, `14-alignObjectMethodScopes.md`

5. **Scope Alignment & Terminals** (passes 15-20):
   `15-alignReactiveScopesToBlockScopesHIR.md`, `16-mergeOverlappingReactiveScopesHIR.md`, `17-buildReactiveScopeTerminalsHIR.md`, `18-flattenReactiveLoopsHIR.md`, `19-flattenScopesWithHooksOrUseHIR.md`, `20-propagateScopeDependenciesHIR.md`

6. **Reactive Function & Transforms** (passes 21-30):
   `21-buildReactiveFunction.md`, `22-pruneUnusedLabels.md`, `23-pruneNonEscapingScopes.md`, `24-pruneNonReactiveDependencies.md`, `25-pruneUnusedScopes.md`, `26-mergeReactiveScopesThatInvalidateTogether.md`, `27-pruneAlwaysInvalidatingScopes.md`, `28-propagateEarlyReturns.md`, `29-promoteUsedTemporaries.md`, `30-renameVariables.md`

7. **Codegen & Optimization** (passes 31, 34-38):
   `31-codegenReactiveFunction.md`, `34-optimizePropsMethodCalls.md`, `35-optimizeForSSR.md`, `36-outlineJSX.md`, `37-outlineFunctions.md`, `38-memoizeFbtAndMacroOperandsInSameScope.md`

8. **Validation Passes** (passes 39-55):
   `39-validateContextVariableLValues.md`, `40-validateUseMemo.md`, `41-validateHooksUsage.md`, `42-validateNoCapitalizedCalls.md`, `43-validateLocalsNotReassignedAfterRender.md`, `44-validateNoSetStateInRender.md`, `45-validateNoDerivedComputationsInEffects.md`, `46-validateNoSetStateInEffects.md`, `47-validateNoJSXInTryStatement.md`, `48-validateNoImpureValuesInRender.md`, `49-validateNoRefAccessInRender.md`, `50-validateNoFreezingKnownMutableFunctions.md`, `51-validateExhaustiveDependencies.md`, `53-validatePreservedManualMemoization.md`, `54-validateStaticComponents.md`, `55-validateSourceLocations.md`

Each agent prompt should be:
```
Analyze how the topic "<topic>" affects the following compiler passes.

Read each pass's documentation in compiler/packages/babel-plugin-react-compiler/docs/passes/ and its implementation source. Also read compiler/docs/rust-port/rust-port-architecture.md for port conventions.

Pass docs to analyze: <list of pass doc filenames>

For each pass, report:
- Pass name and purpose (1 line)
- Impact: "none", "minor" (mechanical changes only), "moderate" (logic changes), or "significant" (redesign needed)
- If impact is not "none": specific details of what changes are needed
- Key code locations in the implementation (file:line references)

Be thorough but concise. Focus on concrete impacts, not speculation.
```

### Step 3: Consolidate and update

After all agents complete:
1. Merge their findings into a coherent analysis
2. Group by impact level (significant > moderate > minor > none)
3. Update the plan document. The final state should reflect the latest findings and understanding:
   - Update the plan document in-place to remove outdated content and describe the latest understanding. 
   - KEEP any existing content that is still relevant
   - REMOVE outdated or now-irrelevant content
   - Per-pass impact summary table (updated in place, ie update each section based on new findings)
   - Detailed notes for passes with moderate+ impact
   - Updated "Current status" or "Remaining Work" section if applicable

### Step 4: Show summary

Show the user a brief summary of findings: how many passes are affected at each level, and the key insights.
