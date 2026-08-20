# outlineJSX

## File
`src/Optimization/OutlineJsx.ts`

## Purpose
This pass outlines nested JSX elements into separate component functions. When a callback function contains JSX, this pass can extract that JSX into a new component, which enables:

1. **Better code splitting** - Outlined components can be lazily loaded
2. **Memoization at component boundaries** - React's reconciliation can skip unchanged subtrees
3. **Reduced closure captures** - Outlined components receive props explicitly

The pass specifically targets JSX within callbacks (like `.map()` callbacks) rather than top-level component returns.

## Input Invariants
- The `enableJsxOutlining` feature flag must be enabled
- The function must be a React component or hook
- JSX must appear within a nested function expression (callback)

## Output Guarantees
- Nested functions containing only JSX returns are extracted as separate components
- The original callback is replaced with a call to the outlined component
- Captured variables become explicit props to the outlined component
- The outlined component is registered with the environment for emission

## Algorithm

### Phase 1: Identify Outlinable JSX
```typescript
function outlineJsxImpl(fn: HIRFunction, outlinedFns: Array<HIRFunction>): void {
  for (const [, block] of fn.body.blocks) {
    for (const instr of block.instructions) {
      if (instr.value.kind === 'FunctionExpression') {
        const innerFn = instr.value.loweredFunc.func;

        // Check if function only returns JSX
        if (canOutline(innerFn)) {
          const outlined = createOutlinedComponent(innerFn);
          outlinedFns.push(outlined);
          replaceWithComponentCall(instr, outlined);
        }
      }
    }
  }
}
```

### Phase 2: Check Outlinability
```typescript
function canOutline(fn: HIRFunction): boolean {
  // Must have exactly one block with only JSX-related instructions
  // Must end with returning JSX
  // Must not have complex control flow

  return (
    fn.body.blocks.size === 1 &&
    returnsJSX(fn) &&
    !hasComplexControlFlow(fn)
  );
}
```

### Phase 3: Create Outlined Component
```typescript
function createOutlinedComponent(fn: HIRFunction): HIRFunction {
  // Convert captured context to props
  const props = fn.context.map(capture => ({
    name: capture.identifier.name,
    type: capture.identifier.type,
  }));

  // Create new component function
  return {
    ...fn,
    params: [{kind: 'Identifier', name: 'props', ...}],
    context: [],  // No captures - all via props
  };
}
```

### Phase 4: Replace Original Callback
```typescript
function replaceWithComponentCall(instr: Instruction, outlined: HIRFunction): void {
  // Original: items.map(item => <Stringify item={item} />)
  // Becomes: items.map(item => <OutlinedComponent item={item} />)

  instr.value = {
    kind: 'JSX',
    tag: {kind: 'LoadGlobal', name: outlined.id},
    props: capturedVariablesToProps(instr.value.context),
  };
}
```

### Phase 5: Register Outlined Functions
```typescript
export function outlineJSX(fn: HIRFunction): void {
  const outlinedFns: Array<HIRFunction> = [];
  outlineJsxImpl(fn, outlinedFns);

  for (const outlinedFn of outlinedFns) {
    fn.env.outlineFunction(outlinedFn, 'Component');
  }
}
```

## Edge Cases

### Context Captures
Variables captured by the callback become props:
```javascript
// Before:
items.map(item => <Card key={item.id} user={currentUser} item={item} />)

// After (outlined):
function OutlinedCard(props) {
  return <Card key={props.item.id} user={props.currentUser} item={props.item} />;
}
items.map(item => <OutlinedCard currentUser={currentUser} item={item} />)
```

### Complex Control Flow
Callbacks with conditionals or loops are not outlined:
```javascript
// Not outlined - has conditional
items.map(item => item.show ? <Card item={item} /> : null)
```

### Multiple JSX Returns
Only single-JSX-return callbacks are outlined:
```javascript
// Not outlined - multiple potential returns
items.map(item => {
  if (item.type === 'a') return <TypeA item={item} />;
  return <TypeB item={item} />;
})
```

### Top-Level JSX
Only JSX in nested callbacks is outlined, not component return values:
```javascript
function Component() {
  return <div />;  // Not outlined - this is the component's return
}
```

### Recursive Outlining
The pass recursively processes outlined components to outline their nested JSX.

## TODOs
None in the source file.

## Example

### Fixture: `outlined-helper.js`

**Input:**
```javascript
// @enableFunctionOutlining
function Component(props) {
  return (
    <div>
      {props.items.map(item => (
        <Stringify key={item.id} item={item.name} />
      ))}
    </div>
  );
}
```

**After OutlineJSX:**
```
// Outlined component:
function _outlined_Component$1(props) {
  return <Stringify key={props.item.id} item={props.item.name} />;
}

// Original component modified:
function Component(props) {
  return (
    <div>
      {props.items.map(item => (
        <_outlined_Component$1 item={item} />
      ))}
    </div>
  );
}
```

**Generated Code:**
```javascript
function _outlined_Component$1(props) {
  const $ = _c(2);
  const item = props.item;
  let t0;
  if ($[0] !== item.id || $[1] !== item.name) {
    t0 = <Stringify key={item.id} item={item.name} />;
    $[0] = item.id;
    $[1] = item.name;
  } else {
    t0 = $[1];
  }
  return t0;
}

function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.items) {
    t0 = props.items.map((item) => <_outlined_Component$1 item={item} />);
    $[0] = props.items;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return <div>{t0}</div>;
}
```

Key observations:
- The map callback JSX is extracted into `_outlined_Component$1`
- The `item` variable becomes a prop instead of a closure capture
- The outlined component gets its own memoization cache
- This enables React to skip re-rendering unchanged list items
