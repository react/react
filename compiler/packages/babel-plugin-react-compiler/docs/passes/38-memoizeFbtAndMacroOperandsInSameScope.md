# memoizeFbtAndMacroOperandsInSameScope

## File
`src/ReactiveScopes/MemoizeFbtAndMacroOperandsInSameScope.ts`

## Purpose
This pass ensures that FBT (Facebook Translation) expressions and their operands are memoized within the same reactive scope. FBT is Facebook's internationalization system that requires special handling to ensure translations work correctly.

The key insight is that FBT operands must be computed and frozen together with the FBT call itself. If operands were memoized in separate scopes, the translation system could receive stale operand values when only some inputs change.

## Input Invariants
- The function has been through type inference
- FBT calls (`fbt`, `fbt.c`, `fbt:param`, etc.) are properly identified
- Custom macros are configured in `fn.env.config.customMacros`
- Reactive scope variables have been inferred

## Output Guarantees
- All operands of FBT calls are assigned to the same reactive scope as the FBT call
- The `fbtOperands` set is returned for use by other passes (e.g., `outlineFunctions`)
- Operand scope assignments use either transitive or shallow inlining based on macro definition

## Algorithm

### Phase 1: Collect Macro Kinds
```typescript
const macroKinds = new Map<Macro, MacroDefinition>([
  ...Array.from(FBT_TAGS.entries()),  // Built-in fbt tags
  ...(fn.env.config.customMacros ?? []).map(([name, def]) => [name, def]),
]);
```

### Phase 2: Populate Macro Tags
```typescript
function populateMacroTags(
  fn: HIRFunction,
  macroKinds: Map<Macro, MacroDefinition>,
): Map<IdentifierId, MacroDefinition> {
  const macroTags = new Map();

  for (const instr of allInstructions(fn)) {
    if (isLoadGlobal(instr) || isPropertyLoad(instr)) {
      const name = getName(instr);
      if (macroKinds.has(name)) {
        macroTags.set(instr.lvalue.id, macroKinds.get(name));
      }
    }
  }

  return macroTags;
}
```

### Phase 3: Merge Macro Arguments
```typescript
function mergeMacroArguments(
  fn: HIRFunction,
  macroTags: Map<IdentifierId, MacroDefinition>,
  macroKinds: Map<Macro, MacroDefinition>,
): Set<IdentifierId> {
  const macroValues = new Set<IdentifierId>();

  for (const instr of allInstructions(fn)) {
    if (isCall(instr) || isMethodCall(instr) || isJSX(instr)) {
      const callee = getCallee(instr);
      const macroDef = macroTags.get(callee.id);

      if (macroDef !== undefined) {
        // Mark all operands to be in same scope
        for (const operand of getOperands(instr)) {
          macroValues.add(operand.id);

          // Merge scope to match macro call scope
          if (macroDef.inlineLevel === InlineLevel.Transitive) {
            mergeScopesTransitively(operand, instr.lvalue);
          } else {
            mergeScopes(operand, instr.lvalue);
          }
        }
      }
    }
  }

  return macroValues;
}
```

### InlineLevel Types
```typescript
enum InlineLevel {
  Shallow,     // Only merge direct operands
  Transitive,  // Merge operands and their dependencies
}
```

## Edge Cases

### Nested FBT Params
FBT params can be nested, and all levels must be in the same scope:
```javascript
<fbt>
  Hello <fbt:param name="user">
    <fbt:param name="firstName">{user.firstName}</fbt:param>
  </fbt:param>
</fbt>
```

### FBT with Complex Expressions
Complex expressions as operands have their entire dependency chain merged:
```javascript
<fbt>
  Count: <fbt:param name="count">{items.length * multiplier}</fbt:param>
</fbt>
// Both items.length and multiplier expressions are merged into fbt scope
```

### Custom Macros
User-defined macros can specify their inlining behavior:
```typescript
customMacros: [
  ['myMacro', { inlineLevel: InlineLevel.Transitive }],
]
```

### Method Calls on FBT
`fbt.param()`, `fbt.plural()`, etc. are handled as method calls:
```javascript
fbt(
  fbt.param('count', items.length),  // MethodCall on fbt
  'description'
)
```

### JSX vs Call Syntax
Both JSX and call syntax for FBT are handled:
```javascript
// JSX syntax
<fbt desc="greeting">Hello</fbt>

// Call syntax
fbt('Hello', 'greeting')
```

## Built-in FBT Tags
The pass recognizes these FBT constructs:
- `fbt` / `fbt.c` - Main translation functions
- `fbt:param` - Parameter substitution
- `fbt:plural` - Plural handling
- `fbt:enum` - Enumeration values
- `fbt:name` - Name parameters
- `fbt:pronoun` - Pronoun handling
- `fbs` - Simple string translation

## TODOs
None in the source file.

## Example

### Fixture: `fbt/fbt-call.js`

**Input:**
```javascript
function Component(props) {
  const text = fbt(
    `${fbt.param('count', props.count)} items`,
    'Number of items'
  );
  return <div>{text}</div>;
}
```

**Before MemoizeFbtAndMacroOperandsInSameScope:**
```
[1] $18 = LoadGlobal import fbt from 'fbt'
[2] $19 = LoadGlobal import fbt from 'fbt'
[3] $20_@0[3:8] = PropertyLoad $19.param
[4] $21 = "(key) count"
[5] $22 = LoadLocal props$17
[6] $23 = PropertyLoad $22.count
[7] $24_@0[3:8] = MethodCall $19.$20_@0($21, $23)  // fbt.param call
[8] $25 = `${$24_@0} items`
[9] $26 = "(description) Number of items"
[10] $27_@1 = Call $18($25, $26)  // fbt call
```

**After MemoizeFbtAndMacroOperandsInSameScope:**
```
[1] $18_@1[1:11] = LoadGlobal import fbt from 'fbt'  // Merged to @1
[2] $19 = LoadGlobal import fbt from 'fbt'
[3] $20_@0[3:8] = PropertyLoad $19.param
[4] $21 = "(key) count"
[5] $22 = LoadLocal props$17
[6] $23 = PropertyLoad $22.count
[7] $24_@1[1:11] = MethodCall $19.$20_@0($21, $23)  // Merged to @1
[8] $25_@1[1:11] = `${$24_@1} items`                // Merged to @1
[9] $26_@1[1:11] = "(description) Number of items" // Merged to @1
[10] $27_@1[1:11] = Call $18_@1($25_@1, $26_@1)     // Main fbt scope @1
```

**Generated Code:**
```javascript
function Component(props) {
  const $ = _c(3);
  let t0;
  if ($[0] !== props.count) {
    // All fbt operands computed in same memoization block
    t0 = fbt(
      `${fbt.param("count", props.count)} items`,
      "Number of items"
    );
    $[0] = props.count;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const text = t0;
  let t1;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <div>{text}</div>;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}
```

Key observations:
- All FBT-related operations are in the same memoization scope `@1`
- `fbt.param`, template literal, and `fbt` call are memoized together
- This ensures the translation system receives consistent operand values
- The entire translation is recomputed when any operand (`props.count`) changes
