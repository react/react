# renameVariables

## File
`src/ReactiveScopes/RenameVariables.ts`

## Purpose
This pass ensures that every named variable in the function has a unique name that doesn't conflict with other variables in the same block scope or with global identifiers. After scope construction and temporary promotion, variables from different source scopes may end up in the same reactive block - this pass resolves any naming conflicts.

The pass also converts the `#t{id}` promoted temporary names into clean output names like `t0`, `t1`, etc.

## Input Invariants
- The ReactiveFunction has been through `promoteUsedTemporaries`
- Variables may have names that conflict with:
  - Other variables in the same or ancestor block scope
  - Global identifiers referenced by the function
  - Promoted temporaries with `#t{id}` or `#T{id}` naming
- The function parameters have names (either from source or promoted)

## Output Guarantees
- Every named variable has a unique name within its scope
- No variable shadows a global identifier referenced by the function
- Promoted temporaries are renamed to `t0`, `t1`, ... (for regular temps)
- Promoted JSX temporaries are renamed to `T0`, `T1`, ... (for JSX tags)
- Conflicting source names get disambiguated with `$` suffix (e.g., `foo$0`, `foo$1`)
- Returns a `Set<string>` of all unique variable names in the function

## Algorithm

### Phase 1: Collect Referenced Globals
Uses `collectReferencedGlobals(fn)` to build a set of all global identifiers referenced by the function. Variable names must not conflict with these.

### Phase 2: Rename with Scope Stack
The `Scopes` class maintains:

```typescript
class Scopes {
  #seen: Map<DeclarationId, IdentifierName> = new Map();  // Canonical name for each declaration
  #stack: Array<Map<string, DeclarationId>> = [new Map()];  // Block scope stack
  #globals: Set<string>;  // Global names to avoid
  names: Set<ValidIdentifierName> = new Set();  // All assigned names
}
```

### Renaming Logic
```typescript
visit(identifier: Identifier): void {
  // Skip unnamed identifiers
  if (originalName === null) return;

  // If we've already named this declaration, reuse that name
  const mappedName = this.#seen.get(identifier.declarationId);
  if (mappedName !== undefined) {
    identifier.name = mappedName;
    return;
  }

  // Find a unique name
  let name = originalName.value;
  let id = 0;

  // Promoted temporaries start with t0/T0
  if (isPromotedTemporary(originalName.value)) {
    name = `t${id++}`;
  } else if (isPromotedJsxTemporary(originalName.value)) {
    name = `T${id++}`;
  }

  // Increment until we find a unique name
  while (this.#lookup(name) !== null || this.#globals.has(name)) {
    if (isPromotedTemporary(...)) {
      name = `t${id++}`;
    } else if (isPromotedJsxTemporary(...)) {
      name = `T${id++}`;
    } else {
      name = `${originalName.value}$${id++}`;  // foo$0, foo$1, etc.
    }
  }

  identifier.name = makeIdentifierName(name);
  this.#seen.set(identifier.declarationId, identifier.name);
}
```

### Scope Management
```typescript
enter(fn: () => void): void {
  this.#stack.push(new Map());
  fn();
  this.#stack.pop();
}

#lookup(name: string): DeclarationId | null {
  // Search from innermost to outermost scope
  for (let i = this.#stack.length - 1; i >= 0; i--) {
    const entry = this.#stack[i].get(name);
    if (entry !== undefined) return entry;
  }
  return null;
}
```

### Visitor Pattern
```typescript
class Visitor extends ReactiveFunctionVisitor<Scopes> {
  override visitBlock(block: ReactiveBlock, state: Scopes): void {
    state.enter(() => {
      this.traverseBlock(block, state);
    });
  }

  override visitScope(scope: ReactiveScopeBlock, state: Scopes): void {
    // Visit scope declarations first
    for (const [_, declaration] of scope.scope.declarations) {
      state.visit(declaration.identifier);
    }
    this.traverseScope(scope, state);
  }

  override visitPlace(id: InstructionId, place: Place, state: Scopes): void {
    state.visit(place.identifier);
  }
}
```

## Edge Cases

### Shadowed Variables
When the compiler merges scopes that had shadowing in the source:
```javascript
function foo() {
  const x = 1;
  {
    const x = 2;  // Shadowed in source
  }
}
```
If both `x` declarations end up in the same compiled scope, they become `x` and `x$0`.

### Global Name Conflicts
If a local variable would conflict with a referenced global:
```javascript
function foo() {
  const Math = 1;  // Conflicts with global Math if used
}
```
The local gets renamed to `Math$0` if `Math` global is referenced.

### Nested Functions
The pass recursively processes nested function expressions, entering a new scope for each function body.

### Pruned Scopes
Pruned scopes don't create a new block scope in the output - the pass traverses their instructions without entering a new scope level.

### DeclarationId Consistency
The pass uses `DeclarationId` to track which identifiers refer to the same variable, ensuring all references get the same renamed name.

## TODOs
None in the source file.

## Example

### Fixture: `simple.js`

**Before RenameVariables:**
```
scope @0 [...] declarations=[#t5$19_@0]
scope @1 [...] dependencies=[#t9$22] declarations=[#t10$23_@1]
```

**After RenameVariables:**
```
scope @0 [...] declarations=[t0$19_@0]
scope @1 [...] dependencies=[t0$22] declarations=[t1$23_@1]
```

Key observations:
- `#t5$19_@0` becomes `t0$19_@0` (first temporary in scope)
- `#t9$22` becomes `t0$22` (first temporary in a different block scope)
- `#t10$23_@1` becomes `t1$23_@1` (second temporary in that block)
- The `#t` prefix is removed and sequential numbering is applied

**Generated Code:**
```javascript
export default function foo(x, y) {
  const $ = _c(4);
  if (x) {
    let t0;  // Was #t5
    if ($[0] !== y) {
      t0 = foo(false, y);
      // ...
    }
    return t0;
  }
  const t0 = y * 10;  // Was #t9, reuses t0 since different block scope
  let t1;  // Was #t10
  // ...
}
```

The pass produces clean, readable output with minimal variable names while avoiding conflicts.
