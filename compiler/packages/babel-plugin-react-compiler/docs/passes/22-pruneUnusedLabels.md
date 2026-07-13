# pruneUnusedLabels

## File
`src/ReactiveScopes/PruneUnusedLabels.ts`

## Purpose
The `pruneUnusedLabels` pass optimizes control flow by:

1. **Flattening labeled terminals** where the label is not reachable via a `break` or `continue` statement
2. **Marking labels as implicit** for terminals where the label exists but is never targeted

This pass removes unnecessary labeled blocks that were introduced during compilation but serve no control flow purpose in the final output. JavaScript labeled statements are only needed when there is a corresponding `break label` or `continue label` that targets them.

## Input Invariants
- The input is a `ReactiveFunction` (after conversion from HIR)
- All `break` and `continue` terminals have:
  - A `target` (BlockId) indicating which label they jump to
  - A `targetKind` that is one of: `'implicit'`, `'labeled'`, or `'unlabeled'`
- Each `ReactiveTerminalStatement` has an optional `label` field containing `id` and `implicit`
- The pass runs after `assertWellFormedBreakTargets` which validates break/continue targets

## Output Guarantees
- Labeled terminals where the label is unreachable are flattened into their parent block
- When flattening, trailing unlabeled `break` statements (that would just fall through) are removed
- Labels that exist but are never targeted have their `implicit` flag set to `true`
- Control flow semantics are preserved - only structurally unnecessary labels are removed

## Algorithm

The pass uses a two-phase approach with a single traversal:

**Phase 1: Collect reachable labels**
```typescript
if ((terminal.kind === 'break' || terminal.kind === 'continue') &&
    terminal.targetKind === 'labeled') {
  state.add(terminal.target);  // Mark this label as reachable
}
```

**Phase 2: Transform terminals**
```typescript
const isReachableLabel = stmt.label !== null && state.has(stmt.label.id);

if (stmt.terminal.kind === 'label' && !isReachableLabel) {
  // Flatten: extract block contents, removing trailing unlabeled break
  const block = [...stmt.terminal.block];
  const last = block.at(-1);
  if (last?.kind === 'terminal' && last.terminal.kind === 'break' &&
      last.terminal.target === null) {
    block.pop();  // Remove trailing break
  }
  return {kind: 'replace-many', value: block};
} else {
  if (!isReachableLabel && stmt.label != null) {
    stmt.label.implicit = true;  // Mark as implicit
  }
  return {kind: 'keep'};
}
```

## Edge Cases

### Trailing Break Removal
When flattening a labeled block, if the last statement is an unlabeled break (`target === null`), it is removed since it would just fall through anyway.

### Implicit vs Labeled Breaks
Only breaks with `targetKind === 'labeled'` count toward label reachability. Implicit breaks (fallthrough) and unlabeled breaks don't make a label "used".

### Continue Statements
Both `break` and `continue` with labeled targets mark the label as reachable.

### Non-Label Terminals with Labels
Other terminal types (like `if`, `while`, `for`) can also have labels. If unreachable, these labels are marked implicit but the terminal is not flattened.

## TODOs
None in the source file.

## Example

### Fixture: `unconditional-break-label.js`

**Input:**
```javascript
function foo(a) {
  let x = 0;
  bar: {
    x = 1;
    break bar;
  }
  return a + x;
}
```

**Output (after full compilation):**
```javascript
function foo(a) {
  return a + 1;
}
```

The labeled block `bar: { ... }` is removed because after the pass runs, constant propagation and dead code elimination further simplify the code.

### Fixture: `conditional-break-labeled.js`

**Input:**
```javascript
function Component(props) {
  const a = [];
  a.push(props.a);
  label: {
    if (props.b) {
      break label;
    }
    a.push(props.c);
  }
  a.push(props.d);
  return a;
}
```

**Output:**
```javascript
function Component(props) {
  const $ = _c(5);
  let a;
  if ($[0] !== props.a || $[1] !== props.b ||
      $[2] !== props.c || $[3] !== props.d) {
    a = [];
    a.push(props.a);
    bb0: {
      if (props.b) {
        break bb0;
      }
      a.push(props.c);
    }
    a.push(props.d);
    // ... cache updates
  } else {
    a = $[4];
  }
  return a;
}
```

The labeled block `bb0: { ... }` is preserved because the `break bb0` inside the conditional targets this label.
