# promoteUsedTemporaries

## File
`src/ReactiveScopes/PromoteUsedTemporaries.ts`

## Purpose
This pass promotes temporary variables (identifiers with no name) to named variables when they need to be referenced across scope boundaries or in code generation. Temporaries are intermediate values that the compiler creates during lowering; they are typically inlined at their use sites during codegen. However, some temporaries must be emitted as separate declarations - this pass identifies and names them.

The pass ensures that:
1. Scope dependencies and declarations have proper names for codegen
2. Variables referenced across reactive scope boundaries are named
3. JSX tag identifiers get special naming (`T0`, `T1`, etc.)
4. Temporaries with interposing side-effects are promoted to preserve ordering

## Input Invariants
- The ReactiveFunction has undergone scope construction and dependency propagation
- Identifiers may have `name === null` (temporaries) or be named
- Scopes have `dependencies`, `declarations`, and `reassignments` populated
- Pruned scopes are properly marked with `kind: 'pruned-scope'`

## Output Guarantees
- All scope dependencies have non-null names
- All scope declarations have non-null names
- JSX tag temporaries use uppercase naming (`T0`, `T1`, ...)
- Regular temporaries use lowercase naming (`#t{id}`)
- All instances of a promoted identifier share the same name (via DeclarationId tracking)
- Temporaries with interposing mutating instructions are promoted to preserve source ordering

## Algorithm

The pass operates in four phases using visitor classes:

### Phase 1: CollectPromotableTemporaries
Collects information about which temporaries may need promotion:

```typescript
class CollectPromotableTemporaries {
  // Tracks pruned scope declarations and whether they're used outside their scope
  pruned: Map<DeclarationId, {activeScopes: Array<ScopeId>; usedOutsideScope: boolean}>

  // Tracks identifiers used as JSX tags (need uppercase names)
  tags: Set<DeclarationId>
}
```

- When visiting a `JsxExpression`, adds the tag identifier to `tags`
- When visiting a `PrunedScope`, records its declarations
- Tracks when pruned declarations are used in different scopes

### Phase 2: PromoteTemporaries
Promotes temporaries that appear in positions requiring names:

```typescript
override visitScope(scopeBlock: ReactiveScopeBlock, state: State): void {
  // Promote all dependencies without names
  for (const dep of scopeBlock.scope.dependencies) {
    if (identifier.name == null) {
      promoteIdentifier(identifier, state);
    }
  }
  // Promote all declarations without names
  for (const [, declaration] of scopeBlock.scope.declarations) {
    if (declaration.identifier.name == null) {
      promoteIdentifier(declaration.identifier, state);
    }
  }
}
```

Also promotes:
- Function parameters without names
- Pruned scope declarations used outside their scope

### Phase 3: PromoteInterposedTemporaries
Handles ordering-sensitive promotion:

```typescript
class PromoteInterposedTemporaries {
  // Instructions that emit as statements can interpose between temp defs and uses
  // If such an instruction occurs, mark pending temporaries as needing promotion

  override visitInstruction(instruction: ReactiveInstruction, state: InterState): void {
    // For instructions that become statements (calls, stores, etc.):
    if (willBeStatement && !constStore) {
      // Mark all pending temporaries as needing promotion
      for (const [key, [ident, _]] of state.entries()) {
        state.set(key, [ident, true]);  // Mark as needing promotion
      }
    }
  }
}
```

This preserves source ordering when side-effects occur between a temporary's definition and use.

### Phase 4: PromoteAllInstancesOfPromotedTemporaries
Ensures all instances of a promoted identifier share the same name:

```typescript
class PromoteAllInstancesOfPromotedTemporaries {
  override visitPlace(_id: InstructionId, place: Place, state: State): void {
    if (place.identifier.name === null &&
        state.promoted.has(place.identifier.declarationId)) {
      promoteIdentifier(place.identifier, state);
    }
  }
}
```

### Naming Convention
```typescript
function promoteIdentifier(identifier: Identifier, state: State): void {
  if (state.tags.has(identifier.declarationId)) {
    promoteTemporaryJsxTag(identifier);  // Uses #T{id} for JSX tags
  } else {
    promoteTemporary(identifier);  // Uses #t{id} for regular temps
  }
  state.promoted.add(identifier.declarationId);
}
```

## Edge Cases

### JSX Tag Temporaries
JSX tags require uppercase names to be valid JSX syntax. The pass tracks which temporaries are used as JSX tags and uses `T0`, `T1`, etc. instead of `t0`, `t1`.

### Pruned Scope Declarations
Declarations in pruned scopes are only promoted if they're actually used outside the pruned scope, avoiding unnecessary variable declarations.

### Const vs Let Temporaries
The pass tracks const identifiers specially - they don't need promotion for ordering purposes since they can't be mutated by interposing instructions.

### Global Loads
Values loaded from globals (and their property loads) are treated as const-like for promotion purposes.

### Method Call Properties
The property identifier in a method call is treated as const-like to avoid unnecessary promotion.

## TODOs
None in the source file.

## Example

### Fixture: `simple.js`

**Input:**
```javascript
export default function foo(x, y) {
  if (x) {
    return foo(false, y);
  }
  return [y * 10];
}
```

**Before PromoteUsedTemporaries:**
```
scope @0 [...] dependencies=[y$14] declarations=[$19_@0]
scope @1 [...] dependencies=[$22] declarations=[$23_@1]
```

**After PromoteUsedTemporaries:**
```
scope @0 [...] dependencies=[y$14] declarations=[#t5$19_@0]
scope @1 [...] dependencies=[#t9$22] declarations=[#t10$23_@1]
```

Key observations:
- `$19_@0` is promoted to `#t5$19_@0` because it's a scope declaration
- `$22` is promoted to `#t9$22` because it's a scope dependency
- `$23_@1` is promoted to `#t10$23_@1` because it's a scope declaration
- The `#t` prefix indicates this is a promoted temporary (later renamed by `renameVariables`)

**Generated Code:**
```javascript
import { c as _c } from "react/compiler-runtime";
export default function foo(x, y) {
  const $ = _c(4);
  if (x) {
    let t0;
    if ($[0] !== y) {
      t0 = foo(false, y);
      $[0] = y;
      $[1] = t0;
    } else {
      t0 = $[1];
    }
    return t0;
  }
  const t0 = y * 10;
  let t1;
  if ($[2] !== t0) {
    t1 = [t0];
    $[2] = t0;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}
```

The promoted temporaries (`#t5`, `#t9`, `#t10`) become the named variables (`t0`, `t1`) in the output after `renameVariables` runs.
