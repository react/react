# inferTypes

## File
`src/TypeInference/InferTypes.ts`

## Purpose
Infers types for all identifiers in the HIR by generating type equations and solving them using unification. This pass annotates identifiers with concrete types (Primitive, Object, Function) based on the operations performed on them and the types of globals/hooks they interact with.

## Input Invariants
- The HIR must be in SSA form (the pass runs after `enterSSA` and `eliminateRedundantPhi`)
- Constant propagation has already run
- Global declarations and hook shapes are available via the Environment

## Output Guarantees
- All identifier types are resolved from type variables (`Type`) to concrete types where possible
- Phi nodes have their operand types unified to produce a single result type
- Function return types are inferred from the unified types of all return statements
- Property accesses on known objects/hooks resolve to the declared property types
- Component props parameters are typed as `TObject<BuiltInProps>`
- Component ref parameters are typed as `TObject<BuiltInUseRefId>`

## Algorithm
The pass uses a classic constraint-based type inference approach with three phases:

1. **Constraint Generation (`generate`)**: Traverses all instructions and generates type equations:
   - Primitives, literals, unary/binary operations -> `Primitive` type
   - Hook/function calls -> Function type with fresh return type variable
   - Property loads -> `Property` type that defers to object shape lookup
   - Destructuring -> Property types for each extracted element
   - Phi nodes -> `Phi` type with all operand types as candidates
   - JSX -> `Object<BuiltInJsx>`
   - Arrays -> `Object<BuiltInArray>`
   - Objects -> `Object<BuiltInObject>`

2. **Unification (`Unifier.unify`)**: Solves constraints by unifying type equations:
   - Type variables are bound to concrete types via substitution
   - Property types are resolved by looking up the object's shape
   - Phi types are resolved by finding a common type among operands (or falling back to `Phi` if incompatible)
   - Function types are unified by unifying their return types
   - Occurs check prevents infinite types (cycles in type references)

3. **Application (`apply`)**: Applies the computed substitutions to all identifiers in the HIR, replacing type variables with their resolved types.

## Key Data Structures
- **TypeVar** (`kind: 'Type'`): A type variable with a unique TypeId, used for unknowns
- **Unifier**: Maintains a substitution map from TypeId to Type, with methods for unification and cycle detection
- **TypeEquation**: A pair of types that should be equal, used as constraints
- **PhiType** (`kind: 'Phi'`): Represents the join of multiple types from control flow merge points
- **PropType** (`kind: 'Property'`): Deferred property lookup that resolves based on object shape
- **FunctionType** (`kind: 'Function'`): Callable type with optional shapeId and return type
- **ObjectType** (`kind: 'Object'`): Object with optional shapeId for shape lookup

## Edge Cases

### Phi Type Resolution
When phi operands have incompatible types, the pass attempts to find a union:
- `Union(Primitive | MixedReadonly) = MixedReadonly`
- `Union(Array | MixedReadonly) = Array`
- If no union is possible, the type remains as `Phi`

### Ref-like Name Inference
When `enableTreatRefLikeIdentifiersAsRefs` is enabled, property access on variables matching the pattern `/^(?:[a-zA-Z$_][a-zA-Z$_0-9]*)Ref$|^ref$/` with property name `current` infers:
- Object type as `TObject<BuiltInUseRefId>`
- Property type as `TObject<BuiltInRefValue>`

### Cycle Detection
The `occursCheck` method prevents infinite types by detecting when a type variable appears in its own substitution. When a cycle is detected, `tryResolveType` removes the cyclic reference from Phi operands.

### Context Variables
- `DeclareContext` and `LoadContext` generate no type equations (intentionally untyped)
- `StoreContext` with `Const` kind does propagate the rvalue type to enable ref inference through context variables

## TODOs
1. **Hook vs Function type ambiguity**:
   > "TODO: callee could be a hook or a function, so this type equation isn't correct. We should change Hook to a subtype of Function or change unifier logic."

2. **PropertyStore rvalue inference**:
   > "TODO: consider using the rvalue type here" - Currently uses a dummy type for PropertyStore to avoid inferring rvalue types from lvalue assignments.

## Example

**Input (infer-phi-primitive.js):**
```javascript
function foo(a, b) {
  let x;
  if (a) {
    x = 1;
  } else {
    x = 2;
  }
  let y = x;
  return y;
}
```

**Before InferTypes (SSA form):**
```
<unknown> x$26: phi(bb2: <unknown> x$21, bb3: <unknown> x$24)
[10] <unknown> $27 = LoadLocal <unknown> x$26
[11] <unknown> $29 = StoreLocal Let <unknown> y$28 = <unknown> $27
```

**After InferTypes:**
```
<unknown> x$26:TPrimitive: phi(bb2: <unknown> x$21:TPrimitive, bb3: <unknown> x$24:TPrimitive)
[10] <unknown> $27:TPrimitive = LoadLocal <unknown> x$26:TPrimitive
[11] <unknown> $29:TPrimitive = StoreLocal Let <unknown> y$28:TPrimitive = <unknown> $27:TPrimitive
```

The pass infers that:
- Literals `1` and `2` are `TPrimitive`
- The phi of two primitives is `TPrimitive`
- Variables `x` and `y` are `TPrimitive`
- The function return type is `TPrimitive`

**Hook type inference example (useState):**
```javascript
const [x, setX] = useState(initialValue);
```

After InferTypes:
- `useState` -> `TFunction<BuiltInUseState>:TObject<BuiltInUseState>`
- Return value `$27` -> `TObject<BuiltInUseState>`
- Destructured `setX` -> `TFunction<BuiltInSetState>:TPrimitive`
